'use client';
import { useRef, useState, useTransition } from 'react';
import type {
  RestaurantRow as Row,
  ImportPreview as Preview,
  DistancePreview,
  CoordinatePreview,
} from '@/lib/restaurant-types';
import {
  updateRestaurant,
  previewImport,
  commitImport,
  previewDistances,
  applyDistances,
  previewCoordinates,
  applyCoordinates,
} from './admin-api';
export default function useAdminRestaurants(
  restaurants: Row[],
  password: string,
  reload: () => Promise<void>,
) {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'errors'>('active');
  const activeCount = restaurants.filter((r) => r.address !== null && r.active === true).length;
  const visibleRestaurants = restaurants.filter(
    (r) => r.address !== null && (r.active === true) === (activeTab === 'active'),
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saving, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const requestInFlight = useRef(false);
  const busy = saving || refreshing;
  function refresh() {
    startRefresh(async () => {
      await reload();
    });
  }
  const [message, setMessage] = useState('');
  // Every save changes the restaurant revision, so it also invalidates the other preview.
  const [distancePreview, setDistancePreview] = useState<DistancePreview | null>(null);
  const [distanceMessage, setDistanceMessage] = useState('');
  const [coordinatePreview, setCoordinatePreview] = useState<CoordinatePreview | null>(null);
  const [coordinateMessage, setCoordinateMessage] = useState('');
  function clearPreviews() {
    setPreview(null);
    setDistancePreview(null);
    setCoordinatePreview(null);
  }
  /** Runs one admin request at a time; a failure is shown with `show` (`fallback` if unknown). */
  async function exclusive(
    show: (text: string) => void,
    fallback: string,
    task: () => Promise<void>,
    onError?: () => void,
  ) {
    if (requestInFlight.current || refreshing) return;
    requestInFlight.current = true;
    setBusy(true);
    show('');
    try {
      await task();
    } catch (e) {
      show(e instanceof Error ? e.message : fallback);
      onError?.();
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [addressMessage, setAddressMessage] = useState('');
  const addressErrors = restaurants.filter((r) => r.address === null);
  async function saveAddress(row: Row) {
    if (!password) {
      setAddressMessage('상단에 관리자 비밀번호를 입력해 주세요.');
      return;
    }
    await exclusive(setAddressMessage, '주소 수정에 실패했습니다.', async () => {
      await updateRestaurant(password, {
        action: 'address',
        id: row.id,
        address: addresses[row.id] ?? row.address ?? '',
        previousAddress: row.address,
      });
      clearPreviews();
      setAddressMessage(`${row.name}: 주소와 좌표를 저장했습니다.`);
      refresh();
    });
  }
  async function upload(mode: 'preview' | 'commit') {
    if (!file || !password) {
      setMessage('관리자 비밀번호와 파일을 입력해 주세요.');
      return;
    }
    await exclusive(
      setMessage,
      '요청에 실패했습니다. 목록을 새로고침해 반영 여부를 확인해 주세요.',
      async () => {
        const form = new FormData();
        form.set('file', file);
        form.set('mode', mode);
        if (preview) {
          form.set('revision', preview.revision);
          form.set('token', preview.token);
        }
        if (mode === 'preview') setPreview(await previewImport(password, form));
        else {
          const result = await commitImport(password, form);
          clearPreviews();
          setMessage(
            `저장 완료: 신규 ${result.summary.added}건, 갱신 ${result.summary.updated}건, 누락 비활성화 ${result.summary.missing}건, 주소 확인 필요 ${result.summary.addressErrors}건`,
          );
          refresh();
        }
      },
      () => {
        if (mode === 'preview') setPreview(null);
      },
    );
  }
  async function toggle(row: Row, active: boolean) {
    if (!password) {
      setMessage('관리자 비밀번호를 입력해 주세요.');
      return;
    }
    await exclusive(setMessage, '상태 변경에 실패했습니다.', async () => {
      await updateRestaurant(password, { id: row.id, active, previous: !!row.active });
      clearPreviews();
      setMessage(`${row.name}: ${active ? '활성' : '비활성'}으로 변경했습니다.`);
      refresh();
    });
  }
  /** Shared flow of the re-measure sections: load a preview, then save exactly that preview. */
  async function remeasure<P>(
    mode: 'preview' | 'apply',
    flow: {
      preview: P | null;
      setPreview: (preview: P | null) => void;
      show: (text: string) => void;
      failure: string;
      load: () => Promise<P>;
      /** Saves the preview and returns the success message. */
      save: (preview: P) => Promise<string>;
    },
  ) {
    if (!password) {
      flow.show('관리자 비밀번호를 입력해 주세요.');
      return;
    }
    await exclusive(
      flow.show,
      flow.failure,
      async () => {
        if (mode === 'preview') flow.setPreview(await flow.load());
        else if (flow.preview) {
          const done = await flow.save(flow.preview);
          clearPreviews();
          flow.show(done);
          refresh();
        }
      },
      () => {
        if (mode === 'preview') flow.setPreview(null);
      },
    );
  }
  function measureDistances(mode: 'preview' | 'apply') {
    return remeasure(mode, {
      preview: distancePreview,
      setPreview: setDistancePreview,
      show: setDistanceMessage,
      failure: '거리 재측정에 실패했습니다.',
      load: () => previewDistances(password),
      save: async (preview) => {
        const result = await applyDistances(password, preview.revision);
        return `저장 완료: 거리 ${result.updated}건을 갱신했습니다.`;
      },
    });
  }
  function measureCoordinates(mode: 'preview' | 'apply') {
    return remeasure(mode, {
      preview: coordinatePreview,
      setPreview: setCoordinatePreview,
      show: setCoordinateMessage,
      failure: '좌표 재측정에 실패했습니다.',
      load: () => previewCoordinates(password),
      save: async (preview) => {
        const result = await applyCoordinates(password, preview);
        return `저장 완료: 좌표 ${result.updated}건을 갱신했습니다. 거리도 함께 다시 계산했습니다.`;
      },
    });
  }
  function onFileChange(next: File | null) {
    setFile(next);
    setPreview(null);
    setMessage('');
  }
  function onAddressChange(id: string, value: string) {
    setAddresses((current) => ({ ...current, [id]: value }));
  }
  return {
    activeTab,
    onTabChange: setActiveTab,
    activeCount,
    visibleRestaurants,
    file,
    onFileChange,
    preview,
    busy,
    message,
    addresses,
    onAddressChange,
    addressMessage,
    addressErrors,
    saveAddress,
    upload,
    toggle,
    distancePreview,
    distanceMessage,
    measureDistances,
    coordinatePreview,
    coordinateMessage,
    measureCoordinates,
  };
}
