import { useState } from "react";

function Chat() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const askLLM = async () => {
    setResponse(""); 
    setLoading(true);

    const res = await fetch("http://localhost:5000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: input }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Flush buffer word by word
      const words = buffer.split(/\s+/);
      buffer = words.pop() || ""; // keep incomplete word in buffer

      for (const word of words) {
        setResponse((prev) => prev + word + " ");
      }
    }

    // flush remaining buffer (last word)
    if (buffer) setResponse((prev) => prev + buffer);

    setLoading(false);
  };

  return (
    <div className="chat-container">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask me anything..."
        rows={3}
      />
      <button onClick={askLLM} disabled={loading}>
        {loading ? "Thinking..." : "Ask"}
      </button>

      <div className="response-box">
        {response}
      </div>
    </div>
  );
}

export default Chat;