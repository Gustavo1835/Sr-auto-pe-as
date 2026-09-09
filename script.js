document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.getElementById('heroCarousel');
  const slides = Array.from(carousel.querySelectorAll('.slide'));
  const dotsContainer = document.getElementById('dots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
 
  let current = 0;
  const AUTOPLAY_DELAY = 6000; // 6s entre slides
  let autoplayTimer = null;
 
  // Cria os dots dinamicamente com base no número de slides
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.classList.add('dot');
    if (index === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', `Ir para o slide ${index + 1}`);
    dot.addEventListener('click', () => goToSlide(index));
    dotsContainer.appendChild(dot);
  });
 
  const dots = Array.from(dotsContainer.querySelectorAll('.dot'));
 
  function goToSlide(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
 
    current = (index + slides.length) % slides.length;
 
    slides[current].classList.add('active');
    dots[current].classList.add('active');
 
    resetAutoplay();
  }
 
  function nextSlide() {
    goToSlide(current + 1);
  }
 
  function prevSlide() {
    goToSlide(current - 1);
  }
 
  function startAutoplay() {
    autoplayTimer = setInterval(nextSlide, AUTOPLAY_DELAY);
  }
 
  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }
 
  nextBtn.addEventListener('click', nextSlide);
  prevBtn.addEventListener('click', prevSlide);
 
  // Pausa o autoplay quando o mouse está sobre o carrossel
  carousel.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
  carousel.addEventListener('mouseleave', startAutoplay);
 
  // Suporte a swipe em telas touch
  let touchStartX = 0;
  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
 
  carousel.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? nextSlide() : prevSlide();
    }
  }, { passive: true });
 
  startAutoplay();
});


// ==========================================================================
// SR SMART GARAGE INTERACTION & AI INTEGRATION (Gemini)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------------------------------------------
  // Configuração — troque pelo número real do WhatsApp (com DDI+DDD)
  // ------------------------------------------------------------------
  const WHATSAPP_NUMERO = '5511999999999'; // TODO: coloque o número real aqui
  const ENDPOINT_IA = '/api/consultar-ia'; // função serverless (Vercel)

  function linkWhatsapp(mensagem) {
    return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
  }

  // Botão flutuante de WhatsApp (sempre visível)
  const whatsappFloat = document.getElementById('whatsappFloat');
  if (whatsappFloat) {
    whatsappFloat.href = linkWhatsapp('Olá! Vim pelo site da SR Autopeças e preciso de ajuda para encontrar uma peça.');
  }

  // Catálogo de peças (mesma fonte usada pela função serverless)
  let catalogo = [];
  fetch('catalogo.json')
    .then((r) => r.json())
    .then((dados) => { catalogo = dados; })
    .catch((err) => console.error('Não foi possível carregar o catálogo:', err));

  function buscarPeca(id) {
    return catalogo.find((p) => p.id === id);
  }

  // Controle de Tabs (Buscar por Veículo vs AI)
  const tabBtns = document.querySelectorAll('.sg-tab-btn');
  const tabContents = document.querySelectorAll('.sg-tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetTab = document.getElementById(btn.dataset.tab);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Tags Rápidas de Sintoma
  const quickTags = document.querySelectorAll('.quick-tag');
  const promptIa = document.getElementById('promptIa');

  quickTags.forEach(tag => {
    tag.addEventListener('click', () => {
      promptIa.value = tag.dataset.query;
      promptIa.focus();
    });
  });

  const resultsArea = document.getElementById('sgResults');
  const cardsList = document.getElementById('sgCardsList');
  const resultadoContexto = document.getElementById('resultadoVeiculoContexto');
  const suporteCta = document.getElementById('sgSuporteCta');
  const suporteMensagem = document.getElementById('sgSuporteMensagem');
  const suporteLink = document.getElementById('sgSuporteLink');
  const btnConsultarIa = document.getElementById('btnConsultarIa');
  const formVeiculo = document.getElementById('formVeiculo');

  function renderizarProdutos(lista) {
    if (!lista.length) {
      cardsList.innerHTML = '';
      return;
    }
    cardsList.innerHTML = lista.map(({ item, match }) => `
      <div class="sg-product-row">
        <div class="sg-product-info">
          <div class="sg-product-thumb"><i class="fa-solid fa-gear"></i></div>
          <div class="sg-product-details">
            <h4>${item.nome} ${match != null ? `<span class="match-badge">${match}% DE MATCH</span>` : ''}</h4>
            <small>${item.marca} · SKU ${item.sku} · OEM ${item.oem}</small>
          </div>
        </div>
        <div class="sg-product-action">
          <div class="sg-product-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
          <button class="btn-buy" onclick="adicionarAoCarrinho('${item.nome.replace(/'/g, "\\'")}', ${item.preco})">COMPRAR</button>
        </div>
      </div>
    `).join('');
  }

  function mostrarSuporte(mensagem) {
    suporteMensagem.textContent = mensagem || 'Fale com um dos nossos especialistas no WhatsApp para te ajudar melhor.';
    suporteLink.href = linkWhatsapp(`Olá! Estou com uma dúvida sobre meu carro: "${promptIa ? promptIa.value : ''}"`);
    suporteCta.style.display = 'block';
  }

  function esconderSuporte() {
    suporteCta.style.display = 'none';
  }

  // ------------------------------------------------------------------
  // Ação ao Consultar IA (Gemini via função serverless)
  // ------------------------------------------------------------------
  if (btnConsultarIa) {
    btnConsultarIa.addEventListener('click', async () => {
      const query = promptIa.value.trim();
      if (!query) {
        alert('Por favor, informe o sintoma do veículo.');
        return;
      }

      const textoOriginal = btnConsultarIa.innerHTML;
      btnConsultarIa.disabled = true;
      btnConsultarIa.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ANALISANDO...`;
      resultsArea.style.display = 'block';
      esconderSuporte();
      resultadoContexto.textContent = 'Consultando a IA...';
      cardsList.innerHTML = '';

      try {
        const resposta = await fetch(ENDPOINT_IA, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sintoma: query }),
        });

        if (!resposta.ok) {
          throw new Error('Falha na consulta à IA');
        }

        const dados = await resposta.json();

        resultadoContexto.textContent = dados.diagnostico
          ? `${dados.diagnostico} Confira com um profissional antes da troca.`
          : `Diagnóstico para: "${query}" — confira com um profissional antes da troca.`;

        const lista = (dados.pecas || [])
          .map((p) => ({ item: buscarPeca(p.id), match: p.match }))
          .filter((p) => p.item);

        renderizarProdutos(lista);

        if (dados.precisaSuporte || lista.length === 0) {
          mostrarSuporte(dados.mensagemSuporte);
        }
      } catch (err) {
        console.error(err);
        resultadoContexto.textContent = 'Não conseguimos consultar a IA agora.';
        cardsList.innerHTML = '';
        mostrarSuporte('Tivemos um problema para consultar a IA agora. Fale com um especialista no WhatsApp.');
      } finally {
        btnConsultarIa.disabled = false;
        btnConsultarIa.innerHTML = textoOriginal;
      }
    });
  }

  // ------------------------------------------------------------------
  // Ação do Formulário Convencional (Buscar por veículo)
  // Filtro local e determinístico pelo catálogo — não usa IA.
  // ------------------------------------------------------------------
  if (formVeiculo) {
    formVeiculo.addEventListener('submit', (e) => {
      e.preventDefault();

      const pecaDigitada = document.getElementById('inputPecaVeiculo').value.trim().toLowerCase();
      resultsArea.style.display = 'block';
      esconderSuporte();

      let encontrados = catalogo;
      if (pecaDigitada) {
        encontrados = catalogo.filter((p) =>
          p.nome.toLowerCase().includes(pecaDigitada) || p.categoria.toLowerCase().includes(pecaDigitada)
        );
      }

      const montadora = document.getElementById('selectMontadora').selectedOptions[0]?.textContent || '';
      const modelo = document.getElementById('selectModelo').selectedOptions[0]?.textContent || '';
      const nomeVeiculo = `${montadora} ${modelo}`.trim() || 'seu veículo';
      resultadoContexto.textContent = `Diagnóstico sugerido para ${nomeVeiculo} — confira com um profissional antes da troca.`;

      const lista = encontrados.slice(0, 3).map((item) => ({ item, match: null }));
      renderizarProdutos(lista);

      if (lista.length === 0) {
        mostrarSuporte('Não encontramos essa peça no catálogo. Fale com um dos nossos especialistas.');
      }
    });
  }

  // Sistema de Carrinho
  let cart = [];
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const btnCartOpen = document.querySelector('.btn-cart');
  const btnCartClose = document.getElementById('closeCart');

  function toggleCart(open) {
    cartDrawer.classList.toggle('active', open);
    cartOverlay.classList.toggle('active', open);
  }

  btnCartOpen.addEventListener('click', () => toggleCart(true));
  btnCartClose.addEventListener('click', () => toggleCart(false));
  cartOverlay.addEventListener('click', () => toggleCart(false));

  window.adicionarAoCarrinho = function(name, price) {
    cart.push({ name, price });
    atualizarDrawerCarrinho();
    toggleCart(true);
  };

  function atualizarDrawerCarrinho() {
    const list = document.getElementById('cartItemsList');
    const total = cart.reduce((acc, item) => acc + item.price, 0);

    list.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div>
          <div class="cart-item-title">${item.name}</div>
          <small class="text-red">R$ ${item.price.toFixed(2).replace('.', ',')}</small>
        </div>
      </div>
    `).join('');

    document.getElementById('cartSubtotal').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
    document.getElementById('cartTotalPix').innerText = `R$ ${(total * 0.9).toFixed(2).replace('.', ',')}`;
    document.querySelector('.btn-cart').innerHTML = `<i class="fa-solid fa-cart-shopping"></i> CARRINHO (${cart.length})`;
  }

  // Ao finalizar, salva o carrinho pra página de checkout (carrinho.html) ler
  const btnFinalizarCompra = document.getElementById('btnFinalizarCompra');
  if (btnFinalizarCompra) {
    btnFinalizarCompra.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('Seu carrinho está vazio.');
        return;
      }
      localStorage.setItem('sr_carrinho', JSON.stringify(cart));
      window.location.href = 'carrinho.html';
    });
  }
});