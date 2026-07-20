import type { InterviewPrepBundle, InterviewStage } from '@/lib/stamp4/simple-apply/types'

const STAGES: InterviewStage[] = ['Phone Screen', 'Technical / Panel', 'Final Round']

export function DeepInterviewPrep({
  bundle,
  researchChecklist,
}: {
  bundle: InterviewPrepBundle
  researchChecklist: string[]
}) {
  return (
    <div className="stack">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Interview prep</p>
          <h2>Question bank by stage</h2>
        </div>
        <div className="stack">
          {STAGES.map((stage) => {
            const stageQuestions = bundle.questions.filter((question) => question.stage === stage)
            if (!stageQuestions.length) return null

            return (
              <div className="stack compact-stack" key={stage}>
                <h3>{stage}</h3>
                <div className="stack compact-stack">
                  {stageQuestions.map((question) => (
                    <details key={question.question}>
                      <summary>{question.question}</summary>
                      <p>{question.answerDirection}</p>
                      <div className="text-block stack compact-stack">
                        <p><strong>Situation:</strong> {question.starOutline.situation}</p>
                        <p><strong>Task:</strong> {question.starOutline.task}</p>
                        <p><strong>Action:</strong> {question.starOutline.action}</p>
                        <p><strong>Result:</strong> {question.starOutline.result}</p>
                      </div>
                      <p>
                        <strong>Likely follow-up:</strong> {question.likelyFollowUp}
                      </p>
                      <p>
                        <strong>Proof:</strong> {question.proofToMention}
                      </p>
                      {question.tamilAudioNote && <p className="muted">{question.tamilAudioNote}</p>}
                    </details>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Before the interview</p>
          <h2>Company research checklist</h2>
          <p>Use these prompts to verify current facts yourself before the call.</p>
        </div>
        <ul className="stack compact-stack">
          {researchChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Interview prep</p>
          <h2>Questions to ask them</h2>
          <p>Asking one or two of these signals you have actually read the role, not just applied broadly.</p>
        </div>
        <div className="stack compact-stack">
          {bundle.questionsToAsk.map((item) => (
            <div className="source-row" key={item.question}>
              <p>
                <strong>{item.question}</strong>
              </p>
              <p className="muted">{item.whyAsk}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Interview prep</p>
          <h2>Salary negotiation prep</h2>
        </div>
        <p>
          <strong>Suggested anchor:</strong> {bundle.salaryNegotiation.suggestedRange}
        </p>
        <p className="muted">{bundle.salaryNegotiation.notes}</p>
        <ul className="stack compact-stack">
          {bundle.salaryNegotiation.talkingPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
