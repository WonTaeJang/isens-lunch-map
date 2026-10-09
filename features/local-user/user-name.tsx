import { splitUserName } from './local-user';
import styles from './user-name.module.css';

/**
 * A nickname with its #tag shown small and faint. Only the look changes: the text (and what
 * screen readers or a copy get) is still the whole "이름#1234".
 */
export default function UserName({ name }: { name: string }) {
  const parts = splitUserName(name);
  return (
    <>
      {parts.name}
      {parts.tag && <span className={styles.tag}>{parts.tag}</span>}
    </>
  );
}
