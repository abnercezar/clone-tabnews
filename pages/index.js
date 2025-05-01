import React from "react";

export default function Home() {
  const posts = [
    {
      title: "Como declarar imposto de renda em 2025?",
      coin: "30 tabcoins",
      comments: "5 comentários",
      author: "ContadorExpert",
      time: "3 horas atrás",
    },
    {
      title: "Principais mudanças na legislação tributária este ano",
      coin: "25 tabcoins",
      comments: "8 comentários",
      author: "FiscalNews",
      time: "1 dia atrás",
    },
    {
      title: "Dicas para organizar a contabilidade da sua empresa",
      coin: "18 tabcoins",
      comments: "3 comentários",
      author: "GestorFinanceiro",
      time: "6 horas atrás",
    },
    {
      title: "Como funciona o Simples Nacional?",
      coin: "20 tabcoins",
      comments: "10 comentários",
      author: "ContabFácil",
      time: "12 horas atrás",
    },
    {
      title: "Erros comuns ao emitir notas fiscais",
      coin: "15 tabcoins",
      comments: "4 comentários",
      author: "NotaFiscalPro",
      time: "2 dias atrás",
    },
    {
      title: "O que é eSocial e como ele impacta sua empresa?",
      coin: "22 tabcoins",
      comments: "6 comentários",
      author: "RHContábil",
      time: "1 dia atrás",
    },
    {
      title: "Planejamento tributário: como pagar menos impostos legalmente",
      coin: "28 tabcoins",
      comments: "7 comentários",
      author: "TributárioMaster",
      time: "5 horas atrás",
    },
    {
      title: "Entenda a diferença entre lucro real e lucro presumido",
      coin: "12 tabcoins",
      comments: "2 comentários",
      author: "FinanceiroSimples",
      time: "9 horas atrás",
    },
    {
      title: "Como evitar multas fiscais na sua empresa",
      coin: "16 tabcoins",
      comments: "5 comentários",
      author: "AuditorFiscal",
      time: "8 horas atrás",
    },
    {
      title: "As principais tendências contábeis para 2025",
      coin: "35 tabcoins",
      comments: "12 comentários",
      author: "ContabTrends",
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
              <h1 className="logo">
                <i
                  className="fa-solid fa-newspaper"
                  style={{
                    color: "#daa520",
                    marginRight: "20px",
                    fontSize: "42px",
                  }}
                ></i>
                Contab News
              </h1>
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
          <p>&copy; 2025 Contabnews - Todos os direitos reservados</p>
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
          background-color: #00244a; /* Azul */
          color: #fff;
          padding: 20px 0; /* Aumenta o tamanho do header */
          border-radius: 15px; /* Deixa o header arredondado */
          box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1); /* Adiciona sombra */
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
          background-color: #00244a;
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
