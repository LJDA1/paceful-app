# Paceful B2B Demo Call Script

**Duration:** 30 minutes
**Goal:** Qualify the prospect, demo the API, and schedule a pilot kickoff

---

## Pre-Call Checklist

- [ ] Research the company (what they do, their users, recent news)
- [ ] Have demo environment ready at `paceful.vercel.app`
- [ ] API docs open at `/api-docs`
- [ ] Prepare 2-3 questions specific to their use case
- [ ] Test screen share

---

## INTRO (2 minutes)

### Opening

> "Thanks for taking the time today. I'm [Name] from Paceful. Before I dive into anything, I'd love to understand more about what you're working on and why emotional readiness predictions caught your attention."

### Set Agenda

> "Here's what I was thinking for our 30 minutes:
> 1. I'll ask a few questions about your use case
> 2. Show you how our prediction API works
> 3. Leave plenty of time for your questions
> 4. If it makes sense, discuss next steps
>
> Does that work for you?"

---

## THEIR USE CASE (3 minutes)

### Discovery Questions

Ask 2-3 of these based on their industry:

**For Dating Apps:**
> "What's your current approach to matching? Do you factor in emotional state or readiness at all?"

> "What percentage of your matches lead to actual dates? What do you think drives that number?"

**For Mental Health Platforms:**
> "How do you currently measure treatment outcomes? Is it self-reported or something more objective?"

> "What does 'success' look like for your users? How do you know when someone has recovered?"

**For HR/Wellness:**
> "Are you seeing patterns in employee burnout or turnover that you're trying to address?"

> "How do you currently support employees going through personal difficulties?"

### Listen For:
- Pain points with current approach
- Metrics they care about (retention, engagement, outcomes)
- Technical constraints (what stack, how they'd integrate)
- Decision-making process (who else is involved)

---

## THE PROBLEM (3 minutes)

### Frame the Problem Based on Their Answers

**Dating Apps:**
> "So if I'm hearing you right, you're matching people based on compatibility—interests, location, preferences—but you don't have a way to know if someone is actually *ready* for a relationship.
>
> That means someone fresh out of a breakup might match with someone who's genuinely ready, and that mismatch leads to bad experiences for both people."

**Mental Health:**
> "It sounds like you're relying on self-reported progress, which is better than nothing, but you know it's subjective. Someone might say they're doing great when they're actually struggling, or vice versa.
>
> Without objective measurement, it's hard to know if your interventions are actually working."

**HR:**
> "So you're supporting employees through EAP programs and wellness benefits, but you don't have visibility into who's actually at risk or recovering. You find out when it's too late—when someone's already burned out or leaving."

### Transition

> "This is exactly the problem we built Paceful to solve. Let me show you how it works."

---

## SOLUTION + DEMO (10 minutes)

### Explain the Concept (2 min)

> "Paceful provides an Emotional Readiness Score—a 0-100 number that predicts how ready someone is for healthy relationships or stressful situations.
>
> We calculate this from behavioral signals: mood patterns, engagement consistency, self-reflection depth. No invasive surveys, no self-reporting bias.
>
> On top of the score, we provide predictions: How long until they're ready? What's the likelihood of a healthy outcome? Are there risk factors we should flag?"

### Show the Demo (5 min)

1. **Open the dashboard** (`paceful.vercel.app/dashboard`)
   > "This is what the user sees. They log moods, write journal entries, and complete exercises. We track all of this to calculate their ERS."

2. **Show ERS page** (`/ers`)
   > "Here's the Emotional Readiness Score. This user is at 62—in the 'Rebuilding' stage. They started at 35 four weeks ago."

3. **Show predictions** (`/predictions`)
   > "And here are the predictions. We estimate they'll reach 'Ready' stage in 3-4 weeks, with 78% confidence. We also flag risk factors—this user shows some emotional volatility in the evenings."

4. **Show API docs** (`/api-docs`)
   > "For your integration, you'd call our REST API. Send us the behavioral data, we return predictions. Simple JSON in and out.
   >
   > Most teams integrate in 1-2 days. We provide sandbox keys, sample code, and a dedicated Slack channel for support."

### Connect to Their Use Case (3 min)

**Dating Apps:**
> "For you, this means you could filter matches by ERS. Someone with a score below 50 might see a message like 'Focus on yourself first'—or you could match them with others in similar stages for friendship instead of romance."

**Mental Health:**
> "You could track ERS over time as an objective outcome metric. If your therapy program works, you'd see scores trending up. You could also identify users at risk of relapse before they self-report issues."

**HR:**
> "You could offer ERS as part of your wellness program—anonymous, opt-in. HR gets aggregate insights ('15% of employees are in recovery stages') without individual data. You can target interventions where they're needed."

---

## THEIR QUESTIONS (7 minutes)

### Common Questions and Answers

**"How accurate is this really?"**
> "84% average accuracy across our prediction types. That's based on backtesting against our user cohort of 50+ people over 4+ weeks. It's early data, but it's real. We share weekly performance reports with partners so you can see exactly how it's performing."

**"What data do you need from us?"**
> "Behavioral signals: mood scores (1-10), engagement frequency, and optionally text content for sentiment analysis. We don't need PII—just anonymized behavioral data tied to a user ID you control."

**"How is this different from just asking people how they feel?"**
> "Self-reporting is biased. People over-report wellness, under-report struggles, and their perception doesn't always match reality. We look at *patterns* in behavior over time, which is more predictive than a single self-assessment."

**"What about privacy concerns?"**
> "We never see user identities. You send us anonymized data, we return predictions. All data is encrypted, we're working toward SOC 2 compliance, and you own your users' data. We're processors, not controllers."

**"This seems early-stage. Why should we work with you now?"**
> "Honest answer: because you'll get better terms and more influence. Our first 5 design partners lock in $2K/month pricing—that's 60% less than standard. You also get input on our roadmap. Early partners shape the product."

**"What if it doesn't work for us?"**
> "That's why the pilot is free. 60 days, no payment, no commitment. If it doesn't work, we part ways. We'd rather have honest feedback than a bad-fit customer."

---

## OBJECTION HANDLING

### "We need to think about it."
> "Totally understand. What specific concerns do you want to think through? Maybe I can address them now, or send you some additional info."

### "We don't have engineering bandwidth right now."
> "The integration is pretty lightweight—most teams do it in 1-2 days. But if timing is the issue, we could start with a paper pilot: I'll run predictions on sample data you provide, and we can validate the value before you write any code."

### "Our legal team will have questions."
> "Happy to do a call with your legal team. I can also send over our data processing agreement and security documentation in advance. What specific areas will they focus on?"

### "We're already working with [competitor]."
> "Interesting—what are they providing? [Listen] Our approach is different because we focus specifically on emotional readiness, not general mental health. We might be complementary rather than competitive."

### "The pricing seems high."
> "For context, a single percentage point improvement in match quality or retention can be worth millions for a dating app or health platform. If our predictions improve your core metrics by even 5%, the ROI is significant. But that's exactly what the free pilot is for—to prove the value before you commit."

---

## NEXT STEPS (5 minutes)

### If They're Interested

> "It sounds like this could be a good fit. Here's what I'd suggest:
>
> 1. I'll send you sandbox API keys today
> 2. We schedule a 30-minute pilot kickoff next week with your technical team
> 3. You run a 60-day pilot at no cost
> 4. At the end, we review results and decide together
>
> Does that work for you? What day next week is good for the kickoff?"

### If They Need More Time

> "No problem. Let me send you:
> - Our one-pager with key stats
> - API documentation
> - Sample integration code
>
> When would be a good time to reconnect? I'd suggest within the next week or two while this is fresh."

### If It's Not a Fit

> "I appreciate you being direct. Can I ask—what's the main blocker? [Listen] That's helpful feedback. If anything changes, we'd love to revisit. I'll keep you updated on our progress."

---

## Post-Call Actions

- [ ] Send follow-up email within 2 hours
- [ ] Include: one-pager, API docs link, sandbox keys (if applicable)
- [ ] Add notes to CRM
- [ ] Schedule next touchpoint
- [ ] If pilot: Create their Slack channel

---

## Email Template: Post-Demo Follow-Up

**Subject:** Paceful pilot next steps + resources

Hi [Name],

Great speaking with you today. As promised, here's everything you need:

**Resources:**
- One-pager: [link]
- API documentation: paceful.vercel.app/api-docs
- Design partner details: paceful.vercel.app/design-partners

**Next Steps:**
[Customize based on conversation]

Let me know if you have any questions. Looking forward to [next step].

Best,
[Your name]

---

*Script version 1.0 | February 2026*
