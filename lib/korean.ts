// 이름 뒤에 붙는 조사 "으로/로"를 받침에 맞춰 고릅니다.
// 숫자는 한국어로 읽는 소리(0 영, 1 일, 3 삼 …)로 판단하고, 판단할 수 없으면 "(으)로"를 씁니다.
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const RIEUL = 8; // ㄹ 받침은 "로"를 씁니다 (서울로, 일로).
// Final consonant index of each digit as read in Korean: 영 일 이 삼 사 오 육 칠 팔 구.
const DIGIT_FINALS = [21, 8, 0, 16, 0, 0, 1, 8, 8, 0];

function finalConsonant(text: string): number | null {
  const last = text.replace(/[\s)\]}>"'’”.,!?…·-]+$/u, '').at(-1);
  if (!last) return null;
  if (/[0-9]/.test(last)) return DIGIT_FINALS[Number(last)];
  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return null;
  return (code - HANGUL_START) % 28;
}

/** Just the "으로", "로" or "(으)로" that follows `name`, for when the name is rendered apart. */
export function euroParticle(name: string) {
  const final = finalConsonant(name);
  if (final === null) return '(으)로';
  return final === 0 || final === RIEUL ? '로' : '으로';
}

/** `name` + "을" or "를", e.g. 고공 서초점 → "고공 서초점을", 서울라멘 → "서울라멘을"; "을(를)" when unknown. */
export function withEul(name: string) {
  const final = finalConsonant(name);
  if (final === null) return `${name}을(를)`;
  return `${name}${final === 0 ? '를' : '을'}`;
}

/** `name` + "으로" or "로", e.g. 고공 서초점 → "고공 서초점으로", 떠도는당근#4947 → "떠도는당근#4947로". */
export function withEuro(name: string) {
  return name + euroParticle(name);
}
