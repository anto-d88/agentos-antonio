const {
  allowCors,
  groq,
  groqModel,
  getConversations,
  getMemories,
  getTasks,
  saveConversation,
  saveMemory,
  detectImportantMemory,
  detectTasks
} = require("./_core");

module.exports = async function handler(req, res) {
  if (allowCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { agentName, agentPrompt, userMessage } = req.body;

    if (!groq) {
      return res.status(500).json({
        error: "Groq non configuré"
      });
    }

    if (!agentPrompt || !userMessage) {
      return res.status(400).json({
        error: "agentPrompt et userMessage sont obligatoires"
      });
    }

    const memories = await getMemories();
    const conversations = await getConversations();
    const tasks = await getTasks();

    const memoryText =
      memories.map((m) => `- ${m.content}`).join("\n") ||
      "Aucune mémoire longue durée.";

    const recentText =
      conversations
        .slice(0, 5)
        .map(
          (c) =>
            `Agent: ${c.agent}\nDemande: ${c.userInput}\nRéponse: ${c.response}`
        )
        .join("\n\n---\n\n") || "Aucun contexte récent.";

    const taskText =
      tasks
        .slice(0, 10)
        .map(
          (t) =>
            `- [${t.status}] ${t.title} | de ${t.from_agent} vers ${t.to_agent}`
        )
        .join("\n") || "Aucune tâche en cours.";

    const systemPrompt = `
Tu es ${agentName || "un agent IA"} dans AgentOS, le système d'agents IA d'Antonio.

MISSION :
${agentPrompt}

MÉMOIRE LONG TERME :
${memoryText}

CONTEXTE RÉCENT :
${recentText}

TÂCHES ACTUELLES :
${taskText}

RÈGLES ABSOLUES :
- Réponds toujours en français.
- Sois clair, utile, concret.
- Pas de blabla.
- N'invente jamais un prénom, une heure, un délai, un prix, une adresse ou un détail non donné.
- Si la demande concerne un SMS ou un mail, donne un message prêt à envoyer.
- Pour La Pause Sandwich : ton professionnel, humain, simple et chaleureux.
`;

    const completion = await groq.chat.completions.create({
      model: groqModel,
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    });

    const responseText =
      completion.choices?.[0]?.message?.content?.trim() ||
      "L’agent n’a pas répondu.";

    await saveConversation({
      agent: agentName || "Agent inconnu",
      userInput: userMessage,
      response: responseText
    });

    if (detectImportantMemory(userMessage)) {
      await saveMemory(userMessage, agentName || "general");
    }

    await detectTasks(agentName || "Agent inconnu", userMessage, responseText);

    res.status(200).json({
      response: responseText
    });
  } catch (error) {
    console.error("Erreur agent :", error);
    res.status(500).json({
      error: "Erreur IA côté serveur"
    });
  }
};