// DRAFT consent text built from the protocol's key points. Replace with the IRB-approved
// form before launch, and change `version` whenever the wording changes.
export const CONSENT = {
  version: 'v2-draft',
  isDraft: true,
  title: 'Before you start',
  intro: 'Please read these points about the study.',
  points: [
    "You'll use practice versions of two apps, chat with a digital assistant, and answer questions, in two parts, one week apart.",
    "We don't collect your real location, address or health data. You'll enter a ZIP code so the store map shows your area; it stays on your device and is never sent to us. Otherwise the apps use a practice address, a practice location and practice health data.",
    "In Part 2 you'll chat with an AI assistant. Your messages are sent to Anthropic, the company that makes it, to write its replies. Afterwards, your conversation and answers, without your name, may be given to AI models from other companies as part of the research.",
    'Some details of the study’s purpose will be explained at the end of Part 2.',
    'Taking part is voluntary, and you can stop at any time.',
  ],
  contact: 'Questions: [researcher name and email]',
  agree: 'I agree to take part',
  decline: 'I do not agree',
}
