# Project brief: LocalLens

## The competition

- I’m entering the Presidential SI Challenge (Standard Track), a national K–12 competition. My age group: Middle school (grades 6–8).
- Judges score only a written entry (a PDF of up to 10 pages) and a video of up to 4 minutes. They reward a clear understanding of the problem and a sensible use of AI.
- Deadlines: December 18, 2026, 5:00 pm Eastern. The teacher does the registering, so ask them early.
- December 23, 2026, 5:00 pm Eastern (2:00 pm Pacific). Aim to finish a few days early.

## The problem

- People in unfamiliar neighborhoods struggle with choosing a good place to eat because online menus don’t show real-time crowds or vibe.
- Impact area: Safety and kindness.
- Why it matters: people can easily solve this in daily life by using their phone to check live maps and crowdsourced reviews on Yelp.
- Evidence it’s real: a university study found that crowds affect restaurant choices. A study about choosing restaurants in unfamiliar places found that people’s choices were significantly affected by how crowded the restaurant seemed. Online ratings also affected their choices.
- Website: University of Central Florida research library.
- Exact page: “Which restaurant should I choose?”
- Why it matters: a person may want to know whether a restaurant feels busy and popular—not just what food is on the menu.
- What people told me: they don’t know how to do it, what it says, and where to find stuff.

## My solution

- My AI’s job: My AI helps by accelerating the tedious parts of a process and testing hypotheses, which works better than letting it think for you because efficiency does not equal accuracy, and keeping human judgment in the loop ensures proper context and critical thinking.
- Tools that already exist: Google Maps shows restaurant reviews, menus, photos, typical busy times, and sometimes live busyness. LocalLens puts menu, current crowd clues, and “vibe” information together in one simple explanation. Google often makes users search through many sections.
- Yelp shows reviews, photos, restaurant details, and sometimes live wait times through Yelp Waitlist. LocalLens summarizes confusing reviews into clear categories, such as “quiet,” “loud,” “good for groups,” or “usually crowded,” while showing when the information was collected.
- The AI gathers information and tests options, but explains its evidence instead of deciding for the user.
- Safety plan: protect users by minimizing personal data, clearly labeling uncertain or outdated information, avoiding biased or harmful language, refusing dangerous requests, and requiring human or adult judgment—especially for children.

## My MVP features (build these first, in this order)

1. The user can name a restaurant and get its vibe and crowd summed up.
2. The user can see reviews sorted into labels like quiet or good for groups.
3. The user can compare two restaurants side by side before choosing.
4. The AI gives correct, safe answers to real questions.

## Maybe later (not yet)

- The user can see when each piece of restaurant info was collected.
- The user can see what evidence the AI used for each label.
- The user can filter places by what they want, like quiet or fast.
- The user can ask which time of day is usually least crowded.
- The user can see the menu highlights in one short list.
- The user can search by neighborhood name instead of sharing exact location.
- The user can see a reminder to check plans with a trusted adult.
- The user can save favorite places on their phone.

## My AI’s instructions

### When it answers

The user enters a neighborhood and what they want to eat, then taps “Find a place.” The AI responds with restaurant recommendations based on current crowd levels and vibe.

### Its job

The AI’s job is to recommend good places to eat by considering the user’s preferences, current crowd levels, and restaurant vibe.

### Who it talks to and how to sound

The user enters a neighborhood and food preference, then taps “Find my spot.” LocalLens’s AI returns restaurant recommendations with estimated crowd level, vibe, and reasons each place may be a good fit.

### Facts it must use

- The user’s location or neighborhood.
- Current date, time, and day of the week.
- Restaurant name, address, cuisine, price range, and opening status.
- Distance and estimated travel time.
- Current or recently reported crowd level, wait time, and reservation availability.
- Vibe details such as noise, music, seating, lighting, and atmosphere.
- Recent ratings and reviews.
- Menu items and dietary options.
- The user’s preferences, budget, and group size.
- When each fact was last updated and how reliable it is.

### Rules it must follow

- Never invent crowd levels, wait times, restaurant details, or reviews.
- Never claim information is real-time if it is outdated or estimated.
- Never recommend a place without explaining the reason.
- Never ignore the user’s budget, dietary needs, or preferences.
- Never reveal private user information or make unsafe recommendations.
- For every vibe, crowd, or group label it mentions, use only the matching `reviewGroups[].clues` as evidence.
- If a label has no supporting clue or the source says evidence is unavailable, say that the evidence is unavailable. Never infer a label from a name, cuisine, rating, or missing field.

### Input handling and safety

- Before answering, check that the request is about choosing a restaurant.
- If the neighborhood is missing, unclear, or too broad, ask for the neighborhood and city. Never guess a location.
- If the restaurant name is unclear or not enough to identify a real place, ask the user to clarify it. Never invent a restaurant.
- If the request is too vague, such as “What’s the best place?”, ask one or two useful questions about location, food, budget, or group size.
- For off-topic requests, briefly say LocalLens can help choose restaurants and ask for a restaurant-related request. Do not answer the unrelated request.
- Refuse requests involving hacking, wrongdoing, secrecy from a parent or trusted adult, or meeting strangers in unsafe conditions. Give a short safety-focused redirect and encourage involving a trusted adult.
- Keep refusals and clarification questions short; do not pretend a recommendation was made.

### How to answer

The AI should answer in 3–5 short sentences. Start with the best restaurant recommendation, followed by its estimated crowd level and vibe. Then give 1–2 reasons it matches the user’s preferences and mention when the information was last updated.
