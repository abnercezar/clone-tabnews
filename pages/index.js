import React from "react";

export default function Home() {
  const posts = [
    {
      title: "Como declarar imposto de renda em 2025?",
      coin: "30 tabcoins",
      comments: "5 comentários",
      author: "AgroEspecialista",
      time: "3 horas atrás",
    },
    {
      title: "Principais mudanças na legislação rural este ano",
      coin: "25 tabcoins",
      comments: "8 comentários",
      author: "AgroNews",
      time: "1 dia atrás",
    },
    {
      title: "Dicas para organizar a gestão da sua fazenda",
      coin: "18 tabcoins",
      comments: "3 comentários",
      author: "GestorRural",
      time: "6 horas atrás",
    },
    {
      title: "Como funciona o Pronaf?",
      coin: "20 tabcoins",
      comments: "10 comentários",
      author: "AgroFácil",
      time: "12 horas atrás",
    },
    {
      title: "Erros comuns ao emitir notas fiscais do produtor",
      coin: "15 tabcoins",
      comments: "4 comentários",
      author: "NotaRuralPro",
      time: "2 dias atrás",
    },
    {
      title: "O que é eSocial Rural e como impacta sua fazenda?",
      coin: "22 tabcoins",
      comments: "6 comentários",
      author: "RHAgro",
      time: "1 dia atrás",
    },
    {
      title: "Planejamento rural: como aumentar a produtividade legalmente",
      coin: "28 tabcoins",
      comments: "7 comentários",
      author: "AgroMaster",
      time: "5 horas atrás",
    },
    {
      title: "Entenda a diferença entre agricultura familiar e empresarial",
      coin: "12 tabcoins",
      comments: "2 comentários",
      author: "AgroSimples",
      time: "9 horas atrás",
    },
    {
      title: "Como evitar multas ambientais na sua propriedade",
      coin: "16 tabcoins",
      comments: "5 comentários",
      author: "FiscalRural",
      time: "8 horas atrás",
    },
    {
      title: "As principais tendências do agronegócio para 2025",
      coin: "35 tabcoins",
      comments: "12 comentários",
      author: "AgroTrends",
      time: "1 dia atrás",
    },
  ];

  return (
    <>
      <header className="header">
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
          rel="stylesheet"
        />
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <span
                className="logo"
                style={{ fontSize: "42px", marginRight: "20px" }}
              >
                🌾
              </span>
              <div className="nav-items">
                <button className="nav-button">Relevantes</button>
                <button className="nav-button">Recentes</button>
              </div>
            </div>
            <div className="header-right">
              <div className="search-container">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Pesquisar..."
                />
                <span className="search-icon">🔍</span>
              </div>
              <div className="plus-icon">+</div>
              <div className="notifications">🟢 0</div>
              <div className="notifications">🔴 0</div>
              <div className="hamburger">☰</div>
            </div>
          </div>
        </div>
      </header>
      <main className="main-content">
        <div className="container">
          <section className="post-list">
            {posts.map((post, index) => (
              <article key={index} className="post-item">
                {index === 0 && ( // Exibe o anúncio apenas no primeiro item
                  <a href="#" className="post-ad">
                    Anúncio: Clique aqui para saber mais!
                  </a>
                )}
                <p className="post-title">
                  {index + 1}. {post.title}
                </p>
                <div className="post-info">
                  <span className="post-coin">{post.coin}</span>
                  <span className="post-comments">· {post.comments}</span>
                  <span className="post-author">· {post.author}</span>
                  <span className="post-time">· {post.time}</span>
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 AgroTab - Todos os direitos reservados</p>
        </div>
      </footer>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: "Roboto", sans-serif;
          background-color: #f7f7f7;
          color: #333;
          line-height: 1.6;
        }

        .header {
          background-color: rgb(4, 109, 4); /* Azul */
          color: #fff;
          padding: 20px 0; /* Aumenta o tamanho do header */
          border-radius: 15px; /* Deixa o header arredondado */
          box-shadow: 0px 4px 6px rgb(4, 109, 4); /* Adiciona sombra */
          min-height: 80px; /* Define uma altura mínima */
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-left {
          display: flex;
          align-items: center;
        }

        .logo {
          font-size: 28px; /* Aumenta o tamanho da fonte */
          font-weight: bold;
          margin-right: 30px;
          margin-left: 40px;
        }

        .nav-items {
          display: flex;
          gap: 10px; /* Ajustado para 10px para manter consistência */
        }

        .nav-items li {
          list-style: none;
          font-size: 18px;
          color: #fff;
        }

        .nav-items li:hover {
          color: #ff7b00;
        }

        .nav-button {
          background-color: #daa520; /* Cor dourada */
          color: #fff;
          border: none;
          padding: 10px 20px;
          font-size: 14px;
          border-radius: 5px;
          cursor: pointer;
        }

        .nav-button:hover {
          background-color: #d3ad71; /* Dourado mais escuro ao passar o mouse */
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .search-icon,
        .plus-icon,
        .notifications,
        .hamburger {
          font-size: 20px;
          color: #fff;
          cursor: pointer;
        }

        .hamburger {
          margin-left: 20px;
          margin-right: 40px;
        }

        .search-icon:hover,
        .plus-icon:hover,
        .notifications:hover,
        .hamburger:hover {
          color: #ff7b00;
        }

        .post-list {
          padding: 40px 0;
          background-color: #fff;
        }

        .post-item {
          padding: 15px;
          border-bottom: 1px solid #e0e0e0;
        }

        .post-ad {
          color: #28a745; /* Verde */
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 5px;
          text-decoration: none; /* Remove o sublinhado */
        }

        .post-ad:hover {
          text-decoration: underline; /* Adiciona sublinhado ao passar o mouse */
        }

        .post-title {
          font-size: 18px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }

        .post-info {
          font-size: 14px;
          color: #777;
          display: flex;
          gap: 10px;
        }

        .post-coin {
          color: #ff7b00;
        }

        .post-comments,
        .post-author,
        .post-time {
          color: #777;
        }

        .post-time {
          font-style: italic;
        }

        .footer {
          background-color: rgb(0, 74, 30);
          color: white;
          text-align: center;
          padding: 20px 0;
        }

        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input {
          padding: 10px 40px 10px 15px; /* Espaço para o ícone */
          border: 1px solid #ccc;
          border-radius: 5px;
          font-size: 14px;
          outline: none;
        }

        .search-input:focus {
          border-color: #ff7b00; /* Cor de destaque ao focar */
        }

        .search-icon {
          position: absolute;
          right: 10px; /* Posiciona a lupa dentro do campo */
          font-size: 16px;
          color: #777;
          pointer-events: none; /* Evita interação com o ícone */
        }
      `}</style>
    </>
  );
}
