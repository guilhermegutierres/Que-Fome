const receitas = [
  {
    id: 1,
    titulo: "Mousse de Limão",
    categoria: "Doces",
    descricao:
      "Sobremesa cremosa, refrescante e fácil de preparar.",
    descricaoCompleta:
      "Uma sobremesa simples e refrescante, perfeita para depois do almoço ou para um momento especial.",
    tempo: "15 min",
    dificuldade: "Fácil",
    custo: "Baixo",
    imagem:
      "https://images.pexels.com/photos/30616885/pexels-photo-30616885/free-photo-of-elegant-lemon-mousse-in-vintage-glassware.jpeg?auto=compress&dpr=1&h=750&w=1260",
    ingredientes: [
      "1 lata de leite condensado",
      "1 lata de creme de leite",
      "Suco de 3 limões",
      "Raspas de limão para decorar",
    ],
    modoPreparo: [
      "Coloque o leite condensado e o creme de leite no liquidificador.",
      "Adicione o suco de limão aos poucos.",
      "Bata até obter uma mistura cremosa e homogênea.",
      "Coloque em um recipiente e leve à geladeira por pelo menos 2 horas.",
      "Finalize com raspas de limão antes de servir.",
    ],
  },

  {
    id: 2,
    titulo: "Lasanha à Bolonhesa",
    categoria: "Massas",
    descricao:
      "Lasanha tradicional com molho à bolonhesa e queijo.",
    descricaoCompleta:
      "Uma lasanha clássica e saborosa para reunir a família em volta da mesa.",
    tempo: "50 min",
    dificuldade: "Médio",
    custo: "Médio",
    imagem:
      "https://images.unsplash.com/photo-1770908811367-e1232962e81b?auto=format&fit=crop&w=1000&q=80",
    ingredientes: [
      "500 g de carne moída",
      "1 pacote de massa para lasanha",
      "1 lata de molho de tomate",
      "300 g de muçarela",
      "200 g de presunto",
      "1 cebola picada",
      "2 dentes de alho",
      "Sal a gosto",
      "Pimenta-do-reino a gosto",
    ],
    modoPreparo: [
      "Refogue a cebola e o alho em uma panela.",
      "Adicione a carne moída e cozinhe até dourar.",
      "Acrescente o molho de tomate e tempere a gosto.",
      "Monte a lasanha em camadas de massa, molho, presunto e queijo.",
      "Repita as camadas até finalizar os ingredientes.",
      "Leve ao forno preaquecido a 180 °C por aproximadamente 30 minutos.",
    ],
  },

  {
    id: 3,
    titulo: "Frango Assado",
    categoria: "Aves",
    descricao:
      "Frango dourado e suculento para o almoço em família.",
    descricaoCompleta:
      "Um frango assado simples, bem temperado e perfeito para acompanhar arroz, batatas ou salada.",
    tempo: "1h",
    dificuldade: "Fácil",
    custo: "Médio",
    imagem:
      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1000&q=80",
    ingredientes: [
      "1 kg de frango",
      "4 dentes de alho",
      "Suco de 1 limão",
      "2 colheres de sopa de azeite",
      "1 colher de chá de páprica",
      "Sal a gosto",
      "Pimenta-do-reino a gosto",
      "Ervas a gosto",
    ],
    modoPreparo: [
      "Tempere o frango com alho, limão, azeite e os demais temperos.",
      "Deixe marinar por pelo menos 30 minutos.",
      "Coloque o frango em uma assadeira.",
      "Leve ao forno preaquecido a 200 °C.",
      "Asse até ficar dourado e completamente cozido.",
      "Sirva ainda quente.",
    ],
  },

  {
    id: 4,
    titulo: "Salada Mediterrânea",
    categoria: "Saladas",
    descricao:
      "Uma salada leve e colorida com ingredientes frescos.",
    descricaoCompleta:
      "Uma opção leve e saudável para acompanhar as refeições ou servir como uma refeição rápida.",
    tempo: "10 min",
    dificuldade: "Muito fácil",
    custo: "Baixo",
    imagem:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80",
    ingredientes: [
      "1 tomate",
      "1 pepino",
      "1/2 cebola roxa",
      "Azeitonas a gosto",
      "Folhas verdes",
      "Queijo branco a gosto",
      "Azeite",
      "Sal a gosto",
      "Limão a gosto",
    ],
    modoPreparo: [
      "Lave bem todos os vegetais.",
      "Corte o tomate, o pepino e a cebola.",
      "Misture os vegetais com as folhas verdes.",
      "Adicione as azeitonas e o queijo.",
      "Tempere com azeite, sal e limão.",
      "Misture delicadamente e sirva.",
    ],
  },

  {
    id: 5,
    titulo: "Bolo de Chocolate",
    categoria: "Bolos",
    descricao:
      "Bolo fofinho de chocolate para qualquer momento.",
    descricaoCompleta:
      "Um bolo de chocolate simples, macio e perfeito para o café da tarde ou para comemorações.",
    tempo: "45 min",
    dificuldade: "Fácil",
    custo: "Baixo",
    imagem:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80",
    ingredientes: [
      "2 xícaras de farinha de trigo",
      "1 xícara de açúcar",
      "1 xícara de chocolate em pó",
      "3 ovos",
      "1 xícara de leite",
      "1/2 xícara de óleo",
      "1 colher de sopa de fermento",
    ],
    modoPreparo: [
      "Misture os ovos, o açúcar e o óleo.",
      "Acrescente o leite e o chocolate em pó.",
      "Adicione a farinha aos poucos.",
      "Misture o fermento delicadamente.",
      "Coloque a massa em uma forma untada.",
      "Asse em forno preaquecido a 180 °C por aproximadamente 35 minutos.",
    ],
  },

  {
    id: 6,
    titulo: "Suco de Laranja",
    categoria: "Sucos",
    descricao:
      "Bebida gelada, simples e perfeita para dias quentes.",
    descricaoCompleta:
      "Um suco natural e refrescante que combina com o café da manhã, almoço ou lanche da tarde.",
    tempo: "5 min",
    dificuldade: "Muito fácil",
    custo: "Baixo",
    imagem:
      "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=1000&q=80",
    ingredientes: [
      "4 laranjas",
      "500 ml de água gelada",
      "Açúcar a gosto",
      "Gelo a gosto",
    ],
    modoPreparo: [
      "Corte as laranjas ao meio.",
      "Esprema todas as laranjas.",
      "Misture o suco com a água gelada.",
      "Adoce a gosto.",
      "Adicione gelo e sirva imediatamente.",
    ],
  },
];

export default receitas;