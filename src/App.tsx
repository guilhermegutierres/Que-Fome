import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Receita from "./pages/Receita";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Favoritos from "./pages/Favoritos";
import AdicionarReceita from "./pages/AdicionarReceita";
import Perfil from "./pages/Perfil";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/receita/:id" element={<Receita />} />

          <Route path="/login" element={<Login />} />

          <Route path="/cadastro" element={<Cadastro />} />

          <Route path="/favoritos" element={<Favoritos />} />

          <Route path="/perfil" element={<Perfil />} />

          <Route
            path="/perfil/receitas/:id/editar"
            element={<AdicionarReceita />}
          />

          <Route path="/adicionar-receita" element={<AdicionarReceita />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
