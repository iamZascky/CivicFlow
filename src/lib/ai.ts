export async function analyzeComplaint(title: string, description: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  const defaultResult = {
    priority: "LOW",
    category: "General",
    sentiment: "Neutral",
    summary: description.slice(0, 50) + (description.length > 50 ? "..." : ""),
    suggestDelete: description.length < 10,
    keyIssues: "N/A",
    recommendedAction: "N/A",
    urgencyReason: "N/A",
  };

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Using fallback mock data.");
    return defaultResult;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze the following complaint from a citizen and return a JSON object with these exact keys:
- "priority": one of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]. Do NOT over-escalate. Use "LOW" for standard maintenance or feature requests. Escalate to "MEDIUM" or "HIGH" if the description indicates the problem has persisted for a long time (e.g. over a week) or causes moderate disruptions. Reserve "HIGH" for significant hazards, and "CRITICAL" for immediate life-threatening emergencies.
- "category": a short category string like "Infrastructure", "Sanitation", "Utilities", "Public Nuisance", "Safety", or "General"
- "sentiment": one of ["Positive", "Neutral", "Negative", "Frustrated", "Panicked", "Constructive"]. Base this on the tone, severity, and duration of the problem. A simple suggestion is "Constructive". If the issue is disruptive, dangerous, or long-lasting, DO NOT use "Neutral"; use "Negative", "Frustrated", or "Panicked" depending on severity. ONLY assign "Positive" if the text explicitly states the issue has already been fixed.
- "summary": a short 1-2 sentence summary of the complaint
- "suggestDelete": a boolean which is true ONLY if the text is complete spam, meaningless, or extremely short (e.g. less than 5 words) and lacks any actionable details.
- "keyIssues": a comma-separated string listing the specific problems identified (e.g., "Pothole, Lack of signage, Traffic hazard").
- "recommendedAction": a short string advising the city on the best action to take (e.g., "Dispatch road maintenance to patch the pothole").
- "urgencyReason": a short string explaining why the assigned priority was given.

Complaint Title: "${title}"
Complaint Description: "${description}"

Respond ONLY with the JSON object. Do not include markdown formatting like \`\`\`json.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status, response.statusText);
      return defaultResult;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      try {
        const cleanedText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        return {
          priority: parsed.priority || defaultResult.priority,
          category: parsed.category || defaultResult.category,
          sentiment: parsed.sentiment || defaultResult.sentiment,
          summary: parsed.summary || defaultResult.summary,
          suggestDelete: parsed.suggestDelete ?? defaultResult.suggestDelete,
          keyIssues: parsed.keyIssues || defaultResult.keyIssues,
          recommendedAction: parsed.recommendedAction || defaultResult.recommendedAction,
          urgencyReason: parsed.urgencyReason || defaultResult.urgencyReason,
        };
      } catch (parseError) {
        console.error("Error parsing Gemini JSON response:", parseError, text);
        return defaultResult;
      }
    }

    return defaultResult;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return defaultResult;
  }
}

export async function checkIfDuplicate(newTitle: string, newDescription: string, existingComplaints: {id: string, title: string, description: string}[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || existingComplaints.length === 0) return null;

  try {
    const prompt = `You are a deduplication assistant. We have a new public complaint and a list of existing active complaints in the same geographic area.
Determine if the new complaint describes the exact same real-world incident as any of the existing complaints.

New Complaint:
Title: "${newTitle}"
Description: "${newDescription}"

Existing Complaints:
${existingComplaints.map(c => `ID: ${c.id}\nTitle: "${c.title}"\nDescription: "${c.description}"`).join('\n\n')}

If it is a duplicate of one of the existing complaints, respond ONLY with a JSON object containing the matching ID: {"duplicateOf": "the-matching-id"}.
If it is NOT a duplicate and describes a separate incident, respond ONLY with: {"duplicateOf": null}.

Respond ONLY with the JSON object. Do not include markdown formatting like \`\`\`json.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
      try {
        const cleanedText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        return parsed.duplicateOf || null;
      } catch (parseError) {
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error in checkIfDuplicate:", error);
    return null;
  }
}
