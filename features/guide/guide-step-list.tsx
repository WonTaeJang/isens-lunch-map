import { GUIDE_STEPS } from './guide-steps';
import styles from './guide.module.css';

/** Every guide step at once: the 사용법 tab of /guide. */
export default function GuideStepList() {
  return (
    <div className={styles.steps}>
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
  );
}
