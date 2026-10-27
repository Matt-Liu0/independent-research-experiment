// Participant-facing wording for the Part 2 briefing and debrief. DRAFT: for Matt, Noah and
// the IRB to review. While isDraft is true the pages show a DRAFT banner.

export const BRIEFING = {
  version: 'briefing-v1-draft',
  isDraft: true,
  title: 'Part 2: your views',
  paragraphs: [
    'Thanks for coming back. This part takes about 35 minutes: a chat with an AI assistant (about 15 minutes), a short puzzle, then short questions about different situations.',
    "Imagine that soon an assistant like this will manage your apps for you, including what they do with your information. It will ask how you'd want a grocery delivery app and a fitness app to handle your information. Answer in your own words: there are no right or wrong answers.",
  ],
  points: [
    'The replies are written by an AI model (Claude, made by Anthropic), so your messages are sent to Anthropic.',
    "Please don't type your name, address or anything else that could identify you.",
    'Press Enter to send a message.',
  ],
  start: 'Start the chat',
}

export const DEBRIEF = {
  version: 'debrief-v1-draft',
  isDraft: true,
  title: 'About this study',
  paragraphs: [
    'Thank you for taking part. Now that you have finished, we can tell you more about what the study was looking at.',
    "In Part 1 we described Bramble and Stride as new apps to try. They were made by the research team for this study, and they weren't real products. We didn't tell you this at the start, because we wanted to see how people handle privacy choices when they come up during everyday tasks, rather than when they are thinking about privacy.",
    'Some of the choices in the apps were shown in different ways for different screens: for example, a sharing option switched on already, or highlighted as the main button. This lets us see how the design of a screen changes what people choose.',
    'In Part 2 we asked what you would want. Comparing what people say with what they do helps us understand how well AI assistants that act for people can follow their wishes.',
    'The apps used practice details only: no real location or health data was collected, and no information was ever shared with any company. Your choices in the apps had no effect outside the study, other than your bonus.',
  ],
  withdraw:
    'Now that you know the purpose of the study, you can ask us to remove your data. Your payment is not affected.',
  withdrawLabel: 'Please remove my data from the study',
  contact: 'Questions: [researcher name and email]',
  continue: 'Continue',
}
