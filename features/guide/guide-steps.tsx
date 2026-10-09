// 사용법 안내: 처음 방문 팝업(한 장씩)과 /guide 페이지(전체)가 같은 내용을 씁니다.
import Image from 'next/image';
import type { ReactNode } from 'react';
import {
  BookmarkIcon,
  BowlChopsticksIcon,
  DiceIcon,
  SearchIcon,
  ThumbsUpIcon,
  UserIcon,
} from '@/components/ui/icons';
import { euroParticle } from '@/lib/korean';
import UserName from '@/features/local-user/user-name';
import { DAILY_REVIEW_LIMIT } from '@/lib/reviews/constants';
import styles from './guide.module.css';

type GuideStep = { title: string; body: (nickname: string | null) => ReactNode };

function Item({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

const MARKERS = [
  { file: 'restaurant-marker-default.svg', label: '식당' },
  { file: 'restaurant-marker-reviewed.svg', label: '내가 리뷰한 식당' },
  { file: 'restaurant-marker-default-favorite.svg', label: '즐겨찾기한 식당' },
  { file: 'restaurant-marker-selected.svg', label: '선택한 식당' },
] as const;

export const GUIDE_STEPS: GuideStep[] = [
  {
    title: 'Lunch Map에 오신 걸 환영해요',
    body: (nickname) => (
      <>
        <p>비플페이로 결제할 수 있는 회사 근처 식당을 지도에 모았어요.</p>
        <p>리스트에서 식당을 누르면 지도가 그 식당으로 이동하고 정보 카드가 열려요.</p>
        {nickname ? (
          <p className={styles.highlight}>
            오늘부터{' '}
            <strong>
              <UserName name={nickname} />
              {euroParticle(nickname)}
            </strong>{' '}
            함께해요.
          </p>
        ) : (
          <p className={styles.highlight}>
            닉네임은 처음 방문할 때 자동으로 만들어져요. 내 페이지에서 확인할 수 있어요.
          </p>
        )}
      </>
    ),
  },
  {
    title: '식당 고르기',
    body: () => (
      <>
        <ul className={styles.items}>
          <Item icon={<SearchIcon size={18} />}>
            식당명·메뉴·주소로 검색하고, 거리(100m~500m)로 좁혀 보세요.
          </Item>
          <Item icon={<BookmarkIcon size={18} />}>
            자주 가는 곳은 즐겨찾기해 두고 <strong>즐겨찾기만</strong> 모아 볼 수 있어요.
          </Item>
          <Item icon={<DiceIcon size={18} />}>
            고민될 때는 <strong>랜덤 추천</strong>으로 한 곳을 골라 보세요.
          </Item>
        </ul>
        <ul className={styles.markers} aria-label="지도 마커 색 안내">
          {MARKERS.map((marker) => (
            <li key={marker.file}>
              <Image src={`/${marker.file}`} alt="" width={20} height={25} unoptimized />
              {marker.label}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    title: '기록하고 나누기',
    body: () => (
      <ul className={styles.items}>
        <Item icon={<BowlChopsticksIcon size={18} />}>
          <strong>오늘의 점심</strong>으로 오늘 갈 식당을 하루 한 곳 기록해요. 바꾸거나 취소할 수도
          있어요.
        </Item>
        <Item icon={<UserIcon size={18} />}>
          기록은 랭킹의 점심 순위와 내 페이지의 점심 기록 달력에 쌓여요.
        </Item>
        <Item icon={<ThumbsUpIcon size={18} />}>
          <strong>리뷰</strong>는 추천·비추천과 태그만으로도 남길 수 있어요. 하루{' '}
          {DAILY_REVIEW_LIMIT}개까지 쓸 수 있어요.
        </Item>
      </ul>
    ),
  },
  {
    title: '꼭 알아 두세요',
    body: () => (
      <>
        <p>로그인 없이 이 브라우저에 내 정보가 저장돼요.</p>
        <p className={styles.warning}>
          브라우저 데이터를 지우면 내가 쓴 리뷰를 수정하거나 삭제할 수 없어요.
        </p>
        <p>
          휴대폰 같은 다른 기기에서는 내 페이지의 <strong>다른 기기에서 이어 쓰기</strong>를 이용해
          주세요.
        </p>
      </>
    ),
  },
];
