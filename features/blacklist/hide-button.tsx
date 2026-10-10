'use client';

import { EyeOffIcon } from '@/components/ui/icons';
import { showSnackbar } from '@/components/ui/snackbar';
import styles from '@/components/ui/square-button.module.css';
import { withEul } from '@/lib/korean';
import { hideBlockReason } from './blacklist-rules';
import useBlacklist from './use-blacklist';

type Props = {
  restaurantId: string;
  restaurantName: string;
  favorite: boolean;
  todayLunch: boolean;
};

/**
 * Hides a restaurant from the map, the lunch list and the random pick, with 되돌리기 in the
 * snackbar. A favorite or today's lunch cannot be hidden: the button looks disabled and a tap
 * says why.
 */
export default function HideButton({ restaurantId, restaurantName, favorite, todayLunch }: Props) {
  const { setHidden } = useBlacklist();
  const blocked = hideBlockReason({ favorite, todayLunch });
  const label = `${restaurantName} 숨기기`;

  async function change(hidden: boolean) {
    if (!(await setHidden(restaurantId, hidden))) return;
    if (hidden)
      showSnackbar(`${withEul(restaurantName)} 숨겼어요.`, {
        duration: 5000,
        action: { label: '되돌리기', onClick: () => void change(false) },
      });
    else showSnackbar(`${withEul(restaurantName)} 다시 보여드려요.`);
  }

  return (
    <button
      type="button"
      className={styles.square}
      aria-label={label}
      aria-disabled={blocked ? true : undefined}
      title={blocked ?? label}
      onClick={() => {
        if (blocked) showSnackbar(blocked);
        else void change(true);
      }}
    >
      <EyeOffIcon size={18} />
    </button>
  );
}
