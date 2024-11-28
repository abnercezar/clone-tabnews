import React, { useEffect, useState } from "react";

function Home() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 500);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "'Roboto', sans-serif",
        color: "#e3e8ea",
        backgroundColor: "#0d1117",
        backgroundImage:
          "url('https://www.transparenttextures.com/patterns/dark-matter.png')",
      }}
    >
      <div
        style={{
          textAlign: "center",
          backgroundColor: "rgba(22, 27, 34, 0.95)",
          padding: "40px",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "600px",
          opacity: visible ? 1 : 0,
          transition: "opacity 2s ease",
        }}
      >
        <h1
          style={{
            fontSize: "3.5em",
            color: "#58a6ff",
            margin: "10px 0",
            animation: "titleGlow ease-in-out infinite alternate",
          }}
        >
          Insight Daily
        </h1>
        <h2
          style={{
            fontSize: "1.8em",
            margin: "20px 0",
            color: "#8b949e",
            animation: "subtitleGlow ease-in-out infinite alternate",
          }}
        >
          Explorando o Futuro da Inovação
        </h2>
        <p
          style={{
            fontSize: "1.1em",
            lineHeight: "1.8",
            color: "#c9d1d9",
            margin: "20px 0",
          }}
        >
          Imagine um espaço onde tecnologia, programação, ciência e exploração
          se encontram. O <strong>Insight Daily</strong> não é apenas uma
          plataforma – é o início de uma jornada para mentes que buscam entender
          e moldar o futuro. Junte-se a nós e seja parte de algo grandioso.
          <br></br>
          <strong>Aguarde...</strong>
        </p>
        <button
          // onClick={() => alert("AGUARDE...")}
          style={{
            marginTop: "30px",
            padding: "12px 24px",
            fontSize: "1em",
            color: "#0d1117",
            backgroundColor: "#58a6ff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#1f6feb";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#58a6ff";
          }}
        >
          Em breve teremos novidades
        </button>
        <footer
          style={{
            marginTop: "30px",
            fontSize: "12px",
            color: "#8b949e",
          }}
        >
          © 2024 Insight Daily. Projetado para quem valoriza o aprendizado e a
          criação de conhecimento autêntico.
        </footer>
      </div>

      {/* CSS in JS for Animations */}
      <style>
        {`
          @keyframes titleGlow {
            0% { text-shadow: 0 0 8px #58a6ff, 0 0 16px #58a6ff, 0 0 24px #58a6ff; }
            100% { text-shadow: 0 0 16px #58a6ff, 0 0 32px #58a6ff, 0 0 48px #58a6ff; }
          }

          @keyframes subtitleGlow {
            0% { text-shadow: 0 0 8px #8b949e, 0 0 16px #8b949e, 0 0 24px #8b949e; }
            100% { text-shadow: 0 0 16px #8b949e, 0 0 32px #8b949e, 0 0 48px #8b949e; }
          }
        `}
      </style>
    </div>
  );
}

export default Home;
