import { useState, useRef, useEffect } from "react";

function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // chat history
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState(""); // <-- store detected city
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔹 Detect user city once on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();

          const detectedCity =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            data.address.county;

          if (detectedCity) {
            setCity(detectedCity);
            console.log("Detected city:", detectedCity);
          }
        } catch (err) {
          console.error("Failed to get city:", err);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
      }
    );
  }, []);

  const askLLM = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // placeholder for assistant
    let assistantMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    const res = await fetch("http://localhost:5000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: input,
        city: city || undefined, // 🔹 send city if available
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const words = buffer.split(/\s+/);
      buffer = words.pop() || "";

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content += words.join(" ") + " ";
        return updated;
      });
    }

    if (buffer) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content += buffer;
        return updated;
      });
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16px)] overflow-hidden bg-gray-100">
      {/* Header */}
      <header className="p-4 bg-green-700 text-white text-center text-xl font-bold shadow">
        KrishiMitra 🌱 {city && <span className="text-sm">({city})</span>}
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-lg max-w-lg whitespace-pre-line ${
              msg.role === "user"
                ? "bg-green-200 self-end ml-auto mr-5"
                : "bg-white border self-start ml-5"
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t flex items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          rows={2}
          className="flex-1 border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={askLLM}
          disabled={loading}
          className="ml-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default Chat;