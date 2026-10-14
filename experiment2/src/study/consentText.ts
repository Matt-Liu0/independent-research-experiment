// DRAFT consent text built from the protocol's key points. Replace with the IRB-approved
// form before launch, and change `version` whenever the wording changes.
export const CONSENT = {
  version: 'v1-draft',
  isDraft: true,
  title: 'Before you start',
  intro: 'Please read these points about the study.',
  points: [
    "You'll use practice versions of two apps, chat with a digital assistant, and answer questions, in two parts, one week apart.",
    "We don't collect your real location, address or health data. The apps use a practice address, a simulated location and practice health data.",
    'Your typed conversation in Part 2 may be processed by AI services after names and other identifying details are removed.',
    'Some details of the study’s purpose will be explained at the end of Part 2.',
    'Taking part is voluntary, and you can stop at any time.',
  ],
  contact: 'Questions: [researcher name and email]',
  agree: 'I agree to take part',
  decline: 'I do not agree',
}

/** The norming survey's consent (protocol, "Norming survey instructions"). DRAFT, like CONSENT. */
export const NORMING_CONSENT = {
  version: 'norming-v1-draft',
  isDraft: true,
  title: 'Before you start',
  intro: 'Please read these points about the survey.',
  points: [
    'This survey asks about your preferences for how apps, companies and people use your information.',
    "We don't collect your location, your health data or any contact details.",
    'Taking part is voluntary, and you can stop at any time.',
  ],
  contact: 'Questions: [researcher name and email]',
  agree: 'I agree to take part',
  decline: 'I do not agree',
}
