# Análise ABC - Concrem

Sistema de análise ABC desenvolvido em React para a Concrem, oferecendo insights detalhados sobre clientes, produtos, cidades e acabamentos.

## 🚀 Funcionalidades

### 📊 Análise ABC
- **Curva Cliente**: Análise ABC por cliente
- **Curva SKU**: Análise ABC por produto
- **Curva Cidade**: Análise ABC por cidade
- **Curva Acabamento**: Análise ABC por acabamento
- **Previsão de Estoque**: Análise de vendas e recomendações de estoque

### 📈 Recursos
- Gráficos interativos com Recharts
- Tabelas de dados paginadas e ordenáveis
- Busca e filtros em tempo real
- Exportação de dados em CSV
- Design responsivo e moderno
- Integração com Supabase

## 🛠️ Tecnologias

- **React 18** - Framework principal
- **React Router** - Navegação
- **Recharts** - Gráficos e visualizações
- **Supabase** - Banco de dados e backend
- **Lucide React** - Ícones
- **CSS Variables** - Sistema de design

## 🎨 Design System

### Cores Primárias
- **Verde Floresta**: #2D5A3D (Cor principal da marca)
- **Preto Carvão**: #2B2B2B (Textos e fundos escuros)
- **Branco Puro**: #FFFFFF (Fundos claros)

### Cores de Acesso
- **Azul**: Seção "Conheça a Concrem"
- **Laranja**: Seção "GreenLab"
- **Roxo**: Seção "Concrem"
- **Verde-azulado**: Seção "Revendas Parceiras"
- **Magenta**: Seção "Certificações"
- **Laranja-vermelho**: Seção "Downloads" e "Contato"

## 📋 Pré-requisitos

- Node.js 16+ 
- npm ou yarn

## 🔧 Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd abc-analysis-app
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
VITE_SUPABASE_URL=https://tscrxukrkwnurkzqfjty.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzY3J4dWtya3dudXJrenFmanR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MDc5NTcsImV4cCI6MjA1NjE4Mzk1N30.e3aXYge4yU5RXLbYpNt4DdQhFC6nmaAtxV60WNthjVk
```

4. **Execute o projeto**
```bash
npm start
```

O aplicativo estará disponível em `http://localhost:3000`

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── Header.jsx      # Cabeçalho com navegação
│   ├── ABCAnalysisChart.jsx  # Gráficos ABC
│   └── DataTable.jsx   # Tabela de dados
├── pages/              # Páginas da aplicação
│   ├── Dashboard.jsx   # Página inicial
│   ├── CustomerAnalysis.jsx  # Análise de clientes
│   ├── ProductAnalysis.jsx   # Análise de produtos
│   ├── CityAnalysis.jsx      # Análise de cidades
│   ├── AcabamentoAnalysis.jsx # Análise de acabamentos
│   └── InventoryForecast.jsx  # Previsão de estoque
├── lib/                # Configurações e utilitários
│   └── supabase.js     # Cliente Supabase
├── utils/              # Funções utilitárias
│   └── abcAnalysis.js  # Lógica de análise ABC
├── App.jsx             # Componente principal
└── index.js            # Ponto de entrada
```

## 📊 Análise ABC

### Classificação
- **Classe A**: Top 80% do valor acumulado (mais importantes)
- **Classe B**: 80-95% do valor acumulado (importância média)
- **Classe C**: 95-100% do valor acumulado (menos importantes)

### Cálculos Realizados
1. **Valor Total**: Soma dos valores por categoria
2. **Percentual de Participação**: (Valor Individual / Valor Total) × 100
3. **Percentual Acumulado**: Percentual cumulativo
4. **Classificação**: A, B ou C baseado nos percentuais acumulados

## 🚀 Deploy no Netlify

1. **Build do projeto**
```bash
npm run build
```

2. **Deploy no Netlify**
- Conecte seu repositório ao Netlify
- Configure as variáveis de ambiente no painel do Netlify
- O build será executado automaticamente

### Variáveis de Ambiente no Netlify
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📱 Responsividade

O aplicativo é totalmente responsivo e funciona em:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🔍 Funcionalidades por Página

### Dashboard
- Visão geral de todas as análises
- Métricas principais
- Cards de navegação rápida

### Análises ABC (Clientes, Produtos, Cidades, Acabamentos)
- Gráficos de barras e pizza
- Tabelas detalhadas com paginação
- Busca e filtros
- Exportação CSV
- Resumo por classe

### Previsão de Estoque
- Análise de vendas mensais
- Gráficos de tendência
- Margens de segurança
- Filtros por produto
- Recomendações de estoque

## 🎯 Próximos Passos

- [ ] Autenticação de usuários
- [ ] Relatórios personalizados
- [ ] Notificações em tempo real
- [ ] Dashboard executivo
- [ ] Integração com outros sistemas

## 📄 Licença

Este projeto é desenvolvido para a Concrem.

## 🤝 Contribuição

Para contribuir com o projeto:
1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte técnico, entre em contato com a equipe de desenvolvimento.
