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
          width: "100%",
          maxWidth: "600px",
          opacity: visible ? 1 : 0,
          transition: "opacity 2s ease",
          overflow: "auto",
        }}
      >
        <h1
          style={{
            fontSize: "2.5em",
            color: "#58a6ff",
            margin: "10px 0",
            animation: "titleGlow ease-in-out infinite alternate",
          }}
        >
          💡 Insight Daily
        </h1>
        <h2
          style={{
            fontSize: "1.4em",
            margin: "20px 0",
            color: "#8b949e",
            animation: "subtitleGlow ease-in-out infinite alternate",
          }}
        >
          Curadoria de Conhecimento e Ideias Transformadoras
        </h2>
        <p
          style={{
            fontSize: "1em",
            lineHeight: "1.6",
            color: "#c9d1d9",
            textAlign: "justify",
          }}
        >
          Vivemos em uma era de abundância de informações, onde o excesso
          frequentemente gera a falta de profundidade e relevância nos
          conteúdos. O <strong>Insight Daily</strong> surge como uma plataforma
          inovadora para curadoria de conhecimento, debates e compartilhamento
          de ideias. Conectamos mentes visionárias para inspirar a próxima
          geração de inovadores.
        </p>
        <p
          style={{
            fontSize: "1em",
            lineHeight: "1.6",
            color: "#c9d1d9",
            textAlign: "justify",
          }}
        >
          Nossa missão é centralizar as melhores ideias sobre tecnologia,
          ciência e inovação, ajudando programadores a transformar projetos em
          realidade.
        </p>
        <p>
          <strong>Em construção...</strong>
        </p>

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
