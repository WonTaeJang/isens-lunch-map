import PageHeading from '@/components/ui/page-heading';
import { GUIDE_STEPS } from '@/features/guide/guide-steps';
import styles from '@/features/guide/guide.module.css';

export const metadata = { title: '사용법 | Lunch Map' };

export default function GuidePage() {
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="HOW TO USE"
        title="사용법"
        description="Lunch Map을 쓰는 방법을 한눈에 정리했어요."
      />
      <div className={styles.page}>
        {GUIDE_STEPS.map((step, index) => (
          <section key={step.title} className={styles.section} aria-labelledby={`guide-${index}`}>
            <h2 id={`guide-${index}`}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              {step.title}
            </h2>
            <div className={styles.body}>{step.body(null)}</div>
          </section>
        ))}
      </div>
    </main>
  );
}
