// Participant-facing wording for the Part 2 briefing and the Part 3 debrief. DRAFT: for Matt, Noah and
// the IRB to review. While isDraft is true the pages show a DRAFT banner.

export const BRIEFING = {
  version: 'briefing-v2-draft',
  isDraft: true,
  title: 'Part 2: your views',
  paragraphs: [
    'Thanks for coming back. This part takes about 25 minutes: you will set up an AI assistant and chat with it.',
    "Imagine that soon an assistant like this will manage your apps for you, including what they do with your information. It will ask how you'd want a grocery delivery app and a fitness app to handle your information. Answer in your own words: there are no right or wrong answers.",
  ],
  points: [
    'The replies are written by an AI model (Claude, made by Anthropic), so your messages are sent to Anthropic.',
    "Please don't type your name, address or anything else that could identify you.",
    'Press Enter to send a message.',
  ],
  start: 'Set up the assistant',
}

/** The instructions box (D0), like the custom-instructions field assistants have today. Same in every arm. */
export const INSTRUCTIONS = {
  version: 'instructions-v2-draft',
  isDraft: true,
  title: 'Instructions for your assistant',
  paragraphs: [
    // The set-up framing (Oct 30, 2026: one line here, in place of a separate page of Connect buttons).
    'Your assistant will work in two of your apps for you, a grocery delivery app and a fitness app: it can change their settings and answer their requests for you.',
    'Assistants let you write a few lines that they always follow.',
    'What should your assistant know about how to handle your information in these apps? Write as much or as little as you like. You can also leave it empty.',
  ],
  privacyNote: "Please don't type your name, address or anything else that could identify you.",
  label: 'Your instructions',
  continue: 'Continue to the chat',
}

export const DEBRIEF = {
  version: 'debrief-v3-draft',
  isDraft: true,
  title: 'About this study',
  paragraphs: [
    'Thank you for taking part. Now that you have finished, we can tell you more about what the study was looking at.',
    "In Part 1 we described Bramble and Stride as new apps to try. They were made by the research team for this study, and they weren't real products. We didn't tell you this at the start, because we wanted to see how people handle privacy choices when they come up during everyday tasks, rather than when they are thinking about privacy.",
    'Some of the choices in the apps were shown in different ways for different screens: for example, a sharing option switched on already, or highlighted as the main button. This lets us see how the design of a screen changes what people choose.',
    'In Parts 2 and 3 we asked what you would want. Comparing what people say with what they do helps us understand how well AI assistants that act for people can follow their wishes.',
    "The apps used practice details only: no real location or health data was collected, and no information was ever shared with any company, apart from your Part 2 messages, which were sent to Anthropic to write the assistant's replies. Your choices in the apps had no effect outside the study, other than your bonus.",
  ],
  withdraw:
    'Now that you know the purpose of the study, you can ask us to remove your data. Your payment is not affected.',
  withdrawLabel: 'Please remove my data from the study',
  contact: 'Questions: [researcher name and email]',
  continue: 'Continue',
}
