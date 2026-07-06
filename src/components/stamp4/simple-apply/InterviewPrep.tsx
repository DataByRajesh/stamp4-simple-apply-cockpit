import type { InterviewQuestion } from '@/lib/stamp4/simple-apply/types'

export function InterviewPrep({ questions }: { questions: InterviewQuestion[] }) {
  return (
    <section className="panel stack">
      <div>
        <p className="eyebrow">Interview prep</p>
        <h2>Question bank</h2>
      </div>
      <div className="stack">
        {questions.map((question) => (
          <details key={question.question}>
            <summary>{question.question}</summary>
            <p>{question.answerDirection}</p>
            <p>
              <strong>Proof:</strong> {question.proofToMention}
            </p>
            {question.tamilAudioNote && <p className="muted">{question.tamilAudioNote}</p>}
          </details>
        ))}
      </div>
    </section>
  )
}
