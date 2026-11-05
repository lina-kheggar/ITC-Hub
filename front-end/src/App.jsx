import { useState, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
  useLocation
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import "./App.css";
// URL de l'API backend (variable d'environnement)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
// Initialisation du client de cache TanStack Query
const queryClient = new QueryClient();
// Helper pour formater les messages d'erreur réseau de manière compréhensible
function formatErrorMessage(err) {
  if (!err) return "Une erreur inattendue est survenue.";
  const msg = typeof err === "string" ? err : err.message || "";
  if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror")) {
    return "Impossible de contacter le serveur backend (http://localhost:5000). Veuillez vous assurer que le serveur Node.js est bien démarré.";
  }
  return msg;
}
// 1. BARRE DE NAVIGATION (NAVBAR)
function Navbar({ user, onLogout, darkMode, setDarkMode }) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <span className="logo-badge">ITC</span>
          <span className="logo-text">ITC Hub</span>
        </Link>
      </div>
      <button className="menu-btn" onClick={() => setMenuOuvert(!menuOuvert)} aria-label="Menu">
        ☰
      </button>
      <div className={`nav-menu ${menuOuvert ? "actif" : ""}`}>
        <Link to="/" onClick={() => setMenuOuvert(false)}>Accueil</Link>
        <Link to="/events" onClick={() => setMenuOuvert(false)}>Événements</Link>
        <Link to="/chat" onClick={() => setMenuOuvert(false)}>Assistant IA</Link>
        {/* Bouton Mode Sombre */}
        <button className="btn-theme" onClick={() => setDarkMode(!darkMode)} title="Changer de thème">
          {darkMode ? "☀️ Clair" : "🌙 Sombre"}
        </button>
        {/* Affichage utilisateur connecté ou lien connexion */}
        {user ? (
          <div className="user-info">
            <span className="user-name">👤 {user.name}</span>
            <span className="user-role">({user.role})</span>
            <button className="btn-logout" onClick={onLogout}>
              Déconnexion
            </button>
          </div>
        ) : (
          <Link to="/login" className="btn-login" onClick={() => setMenuOuvert(false)}>
            Connexion
          </Link>
        )}
      </div>
    </nav>
  );
}
// 2. PAGE D'ACCUEIL (HOME)
function Home() {
  const departements = [
    { nom: "Web Dev", desc: "React, Node.js, Express et architectures modernes." },
    { nom: "AI Lab", desc: "Python, Machine Learning, Deep Learning et LLMs." },
    { nom: "Cybersecurity", desc: "Sécurité informatique, hacking éthique et CTF." },
    { nom: "Mobile Dev", desc: "Développement d'applications Flutter et Android." },
    { nom: "UI/UX Design", desc: "Design système, ergonomie et maquettage Figma." }
  ];

  return (
    <div className="home-container">
      <section className="hero">
        <span className="hero-tag">IT Community · Université de Blida</span>
        <h1>Bienvenue sur ITC Hub</h1>
        <p>
          Découvrez nos ateliers technologiques, inscrivez-vous aux événements et échangez direct avec notre assistant IA intelligent. </p>
        <div className="hero-buttons">
          <Link to="/events" className="btn-primary">
            Voir les événements →
          </Link>
          <Link to="/chat" className="btn-secondary">
            Parler à l'Assistant IA 💬
          </Link>
        </div>
      </section>
      <section className="section-dept">
        <h2>Les Départements du Club</h2>
        <div className="grid-dept">
          {departements.map((d) => (
            <div className="card-dept" key={d.nom}>
              <h3>{d.nom}</h3>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
// 3. PAGE DES ÉVÉNEMENTS (EVENTS)
function Events() {
  const client = useQueryClient();
  const [recherche, setRecherche] = useState("");
  const [filtreDept, setFiltreDept] = useState("Tous");
  // Utilisation de TanStack Query pour la mise en cache (staleTime 60 secondes)
  const {
    data: reponseData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/events`);
      if (!res.ok) throw new Error("Impossible de charger les événements.");
      return res.json();
    },
    staleTime: 60_000 // Le cache reste valide pendant 60s
  });

  const listeEvents = Array.isArray(reponseData)
    ? reponseData
    : reponseData?.data || reponseData?.events || [];

  // Filtrage par recherche et par département
  const eventsFiltres = listeEvents.filter((ev) => {
    const matchDept =
      filtreDept === "Tous" ||
      (ev.department && ev.department.toLowerCase().includes(filtreDept.toLowerCase()));
    const matchRecherche =
      recherche === "" ||
      ev.title?.toLowerCase().includes(recherche.toLowerCase()) ||
      ev.description?.toLowerCase().includes(recherche.toLowerCase());
    return matchDept && matchRecherche;
  });
  // Préchargement des détails de l'événement au survol (hover)
  const prechargerEvent = (id) => {
    client.prefetchQuery({
      queryKey: ["event", id],
      queryFn: () => fetch(`${API_URL}/api/events/${id}`).then((r) => r.json()),
      staleTime: 60_000
    });
  };

  return (
    <div className="page">
      <h1>Événements & Ateliers</h1>
      <p className="sous-titre">Inscrivez-vous aux prochaines sessions organisées par le club.</p>
      {/* Barre de filtres et recherche */}
      <div className="filtres-bar">
        <input type="text" placeholder="Rechercher un événement..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="input-search" />
        <div className="filtre-pills">
          {["Tous", "Web Dev", "AI Lab", "Cybersecurity", "Mobile", "Design"].map((dept) => (
            <button  key={dept}   className={`pill ${filtreDept === dept ? "actif" : ""}`} onClick={() => setFiltreDept(dept)} >
              {dept}
            </button>
          ))}
        </div>
      </div>
      {/* État 1 : Chargement */}
      {isLoading && <p className="msg-info">Chargement des événements...</p>}
      {/* État 2 : Erreur avec bouton Réessayer */}
      {error && (
        <div className="msg-erreur-box">
          <p>⚠️ {formatErrorMessage(error)}</p>
          <button className="btn-primary" onClick={() => refetch()}> Réessayer </button>
        </div>
      )}
      {/* État 3 : Liste vide */}
      {!isLoading && !error && eventsFiltres.length === 0 && (
        <p className="msg-info">Aucun événement ne correspond à votre recherche.</p>
      )}
      {/* Affichage des événements */}
      {!isLoading && !error && eventsFiltres.length > 0 && (
        <div className="events-grid">
          {eventsFiltres.map((ev) => {
            const id = ev.id || ev._id;
            return (
              <div key={id} className="event-card"  onMouseEnter={() => prechargerEvent(id)} >
                <span className="badge-dept">{ev.department || "Général"}</span>
                <h3>{ev.title}</h3>
                <p className="event-desc">{ev.description}</p>
                <div className="event-details-mini">
                  <span>📍 {ev.location || "Université de Blida"}</span>
                  <span>🗓️ {ev.date ? new Date(ev.date).toLocaleDateString("fr-FR") : "À préciser"}</span>
                  {ev.capacity && <span>👥 {ev.capacity} places</span>}
                </div>
                <Link to={`/events/${id}`} className="btn-details">
                  Voir les détails →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// 4. DÉTAILS D'UN ÉVÉNEMENT (EVENT DETAILS)
function EventDetails({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [msgInscription, setMsgInscription] = useState("");
  const [enCours, setEnCours] = useState(false);
  // TanStack Query pour récupérer les détails de l'événement
  const {
    data: eventData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/events/${id}`);
      if (!res.ok) throw new Error("Événement introuvable.");
      const json = await res.json();
      return json.data || json.event || json;
    },
    staleTime: 60_000
  });
  // Action d'inscription
  async function sInscrire() {
    if (!user) {
      navigate("/login");
      return;
    }

    setEnCours(true);
    setMsgInscription("");

    try {
      const res = await fetch(`${API_URL}/api/events/${id}/register`, {
        method: "POST",
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Erreur lors de l'inscription.");
      }

      setMsgInscription("✅ Inscription réussie avec succès !");
      // Invalidation du cache des événements pour rafraîchir les données
      client.invalidateQueries({ queryKey: ["events"] });
      client.invalidateQueries({ queryKey: ["event", id] });
    } catch (err) {
      setMsgInscription("❌ " + formatErrorMessage(err));
    } finally {
      setEnCours(false);
    }
  }

  if (isLoading) return <p className="msg-info">Chargement de l'événement...</p>;

  if (error) {
    return (
      <div className="page">
        <div className="msg-erreur-box">
          <p>⚠️ {formatErrorMessage(error)}</p>
          <button className="btn-primary" onClick={() => refetch()}> Réessayer </button>
        </div>
      </div>
    );
  }

  const ev = eventData;
  if (!ev) return <p className="msg-info">Événement introuvable.</p>;

  return (
    <div className="page details-page">
      <Link to="/events" className="retour-link">← Retour à la liste</Link>
      <div className="details-card">
        <span className="badge-dept">{ev.department || "ITC"}</span>
        <h1>{ev.title}</h1>
        <p className="details-full-desc">{ev.description}</p>
        <div className="details-infos">
          <p><strong>Date :</strong> {ev.date ? new Date(ev.date).toLocaleString("fr-FR") : "À préciser"}</p>
          <p><strong>Lieu :</strong> {ev.location || "Université de Blida"}</p>
          <p><strong>Capacité :</strong> {ev.capacity || 50} places</p>
        </div>

        {msgInscription && <p className="msg-retour">{msgInscription}</p>}

        <button className="btn-primary" onClick={sInscrire} disabled={enCours} >
          {enCours ? "Inscription en cours..." : "S'inscrire à cet événement"}
        </button>
      </div>
    </div>
  );
}
// 5. ASSISTANT IA (CHAT AVEC STREAMING SSE)
function Chat({ user }) {
  const [messages, setMessages] = useState(() => {
    // Récupération depuis sessionStorage pour ne pas perdre la conversation au rafraîchissement
    try {
      const sauve = sessionStorage.getItem("itc_chat_messages");
      if (sauve) return JSON.parse(sauve);
    } catch (e) {
      // ignore
    }
    return [
      {
        id: "msg-0",
        role: "assistant",
        content: "Bonjour ! Je suis l'assistant d'ITC Hub. Posez-moi des questions sur nos ateliers, nos départements ou le club !"
      }
    ];
  });

  const [saisie, setSaisie] = useState("");
  const [enEcriture, setEnEcriture] = useState(false);
  const [erreurChat, setErreurChat] = useState("");
  const chatFinRef = useRef(null);
  // Défilement automatique vers le bas à chaque nouveau token
  useEffect(() => {
    chatFinRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, enEcriture]);
  // Sauvegarde dans sessionStorage (pas de tokens en localStorage)
  useEffect(() => {
    try {
      sessionStorage.setItem("itc_chat_messages", JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);
  // Envoi d'un message avec Server-Sent Events (SSE)
  async function envoyerMessage(e) {
    e.preventDefault();
    const texte = saisie.trim();
    if (!texte || enEcriture) return;

    if (!user) {
      setErreurChat("Veuillez vous connecter pour poser une question.");
      return;
    }

    setErreurChat("");
    setSaisie("");

    const nouveauMsgUser = { id: "user-" + Date.now(), role: "user", content: texte };
    const nouveauMsgBot = { id: "bot-" + Date.now(), role: "assistant", content: "" };

    setMessages((prev) => [...prev, nouveauMsgUser, nouveauMsgBot]);
    setEnEcriture(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream"
        },
        credentials: "include",
        body: JSON.stringify({ message: texte, stream: true })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || err.message || "Erreur de l'assistant.");
      }
      // Lecture du flux SSE mot par mot
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botTexte = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lignes = chunk.split("\n");

        for (const ligne of lignes) {
          if (ligne.startsWith("data: ")) {
            const dataStr = ligne.slice(6).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.token) {
                botTexte += parsed.token;
                setMessages((prev) => {
                  const copie = [...prev];
                  const dernier = copie.length - 1;
                  copie[dernier] = {
                    ...copie[dernier],
                    id: parsed.messageId || copie[dernier].id,
                    content: botTexte
                  };
                  return copie;
                });
              }
            } catch (errJson) {
              // ignore morceaux partiels
            }
          }
        }
      }
    } catch (err) {
      setErreurChat(formatErrorMessage(err));
      setMessages((prev) => {
        const copie = [...prev];
        const dernier = copie.length - 1;
        copie[dernier] = {
          ...copie[dernier],
          content: "Désolé, une erreur est survenue lors de la communication avec l'assistant."
        };
        return copie;
      });
    } finally {
      setEnEcriture(false);
    }
  }
  // Évaluation d'une réponse 
  async function voterReponse(msgId, vote) {
    try {
      await fetch(`${API_URL}/api/chat/messages/${msgId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedback: vote })
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, feedback: vote } : m))
      );
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="page chat-page">
      <h1>Assistant IA ITC</h1>
      <p className="sous-titre">Posez vos questions sur le club (groundé avec la base d'événements en direct).</p>
      <div className="chat-boite">
        <div className="chat-messages">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`message-ligne ${isUser ? "ligne-user" : "ligne-bot"}`}>
                <div className={`bulle ${isUser ? "bulle-user" : "bulle-bot"}`}>
                  <p>{m.content || (enEcriture && !isUser ? "..." : "")}</p>
                  {/* Boutons d'évaluation sur les réponses du bot */}
                  {!isUser && m.content && (
                    <div className="feedback-mini">
                      <span>Utile ?</span>
                      <button  className={m.feedback === "helpful" ? "vote-actif" : ""} onClick={() => voterReponse(m.id, "helpful")} title="Utile" > 👍 </button>
                      <button className={m.feedback === "unhelpful" ? "vote-actif" : ""}  onClick={() => voterReponse(m.id, "unhelpful")}  title="Pas utile" > 👎</button>
                      {m.feedback && <span className="merci">Merci !</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {enEcriture && <p className="typing-indicateur">L'assistant ITC écrit...</p>}
          <div ref={chatFinRef} />
        </div>

        {erreurChat && <p className="msg-erreur-chat">⚠️ {erreurChat}</p>}

        <form onSubmit={envoyerMessage} className="chat-form">
          <input
            type="text"
            placeholder={user ? "Posez votre question..." : "Connectez-vous pour discuter..."}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            disabled={enEcriture}
          />
          <button type="submit" className="btn-primary" disabled={!saisie.trim() || enEcriture}>
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
//  WIDGET FLOTTANT CHAT
function FloatingChat({ user }) {
  const [ouvert, setOuvert] = useState(false);
  const location = useLocation();

  if (location.pathname === "/chat") return null;

  return (
    <div className="floating-widget">
      {ouvert && (
        <div className="widget-boite">
          <div className="widget-header">
            <span>ITC Assistant</span>
            <button onClick={() => setOuvert(false)}>✕</button>
          </div>
          <div className="widget-contenu">
            <p>Besoin d'aide ?</p>
            <Link to="/chat" className="btn-primary" onClick={() => setOuvert(false)}>
              Ouvrir le Chat plein écran 💬
            </Link>
          </div>
        </div>
      )}
      <button className="widget-declencheur" onClick={() => setOuvert(!ouvert)}>
        {ouvert ? "✕" : "💬"}
      </button>
    </div>
  );
}
//  AUTHENTIFICATION (LOGIN / REGISTER)
function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreurs, setErreurs] = useState({});
  const [msgServeur, setMsgServeur] = useState("");
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();
  // Validation des champs côté client
  function validerFormulaire() {
    const err = {};

    if (!isLogin && !nom.trim()) {
      err.nom = "Le nom complet est obligatoire.";
    }

    if (!email.trim()) {
      err.email = "L'adresse email est requise.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      err.email = "Format d'adresse email invalide.";
    }

    if (!password) {
      err.password = "Le mot de passe est requis.";
    } else if (password.length < 6) {
      err.password = "Le mot de passe doit comporter au moins 6 caractères.";
    }

    setErreurs(err);
    return Object.keys(err).length === 0;
  }

  async function soumettre(e) {
    e.preventDefault();
    if (!validerFormulaire() || chargement) return;

    setChargement(true);
    setMsgServeur("");

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin ? { email, password } : { name: nom, email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Erreur d'authentification.");
      }

      onLoginSuccess(data.user);
      navigate("/events");
    } catch (err) {
      setMsgServeur(formatErrorMessage(err));
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`tab-btn ${isLogin ? "actif" : ""}`}
            onClick={() => { setIsLogin(true); setErreurs({}); setMsgServeur(""); }}
          >
            Se connecter
          </button>
          <button className={`tab-btn ${!isLogin ? "actif" : ""}`} onClick={() => { setIsLogin(false); setErreurs({}); setMsgServeur(""); }} > Créer un compte </button>
        </div>
        <h2>{isLogin ? "Connexion" : "Inscription"}</h2>

        {msgServeur && <p className="msg-erreur-champ">⚠️ {msgServeur}</p>}

        <form onSubmit={soumettre} noValidate>
          {!isLogin && (
            <div className="form-group">
              <label>Nom complet</label>
              <input type="text" placeholder="Votre nom" value={nom} onChange={(e) => setNom(e.target.value)} />
              {erreurs.nom && <span className="msg-erreur-champ">{erreurs.nom}</span>}
            </div>
          )}

          <div className="form-group">
            <label>Adresse e-mail</label>
            <input type="email" placeholder="exemple@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {erreurs.email && <span className="msg-erreur-champ">{erreurs.email}</span>}
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" placeholder="Minimum 6 caractères" value={password} onChange={(e) => setPassword(e.target.value)} />
            {erreurs.password && <span className="msg-erreur-champ">{erreurs.password}</span>}
          </div>
          <button type="submit" className="btn-primary full" disabled={chargement}>
            {chargement ? "Patientez..." : isLogin ? "Se connecter" : "S'inscrire"}
          </button>
        </form>
      </div>
    </div>
  );
}
//  COMPOSANT RACINE (APP)
export default function App() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  // Vérification de la session active au chargement
  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);
  // Déconnexion
  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
    // ignore
    }
    setUser(null);
    sessionStorage.removeItem("itc_chat_messages");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className={`app-container ${darkMode ? "dark" : ""}`}>
          <Navbar
            user={user} onLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails user={user} />} />
              <Route path="/chat" element={<Chat user={user} />} />
              <Route path="/login" element={<Auth onLoginSuccess={(u) => setUser(u)} />} />
            </Routes>
          </main>

          <FloatingChat user={user} />

          <footer className="footer">
            <p>© 2026 ITC Hub · IT Community Saad Dahleb Blida University</p>
          </footer>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
