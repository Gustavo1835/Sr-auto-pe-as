// carrinho.js
document.addEventListener('DOMContentLoaded', () => {
  const FRETE_PADRAO = 29.90;
  const FRETE_GRATIS_A_PARTIR_DE = 299;

  // ------------------------------------------------------------------
  // 1. Carrinho (lido do localStorage, salvo pela página principal)
  // ------------------------------------------------------------------
  let carrinho = [];
  try {
    carrinho = JSON.parse(localStorage.getItem('sr_carrinho') || '[]');
  } catch (e) {
    carrinho = [];
  }

  const subtotal = carrinho.reduce((acc, item) => acc + item.price, 0);
  const frete = subtotal === 0 || subtotal >= FRETE_GRATIS_A_PARTIR_DE ? 0 : FRETE_PADRAO;
  const total = subtotal + frete;
  const totalPix = subtotal * 0.9 + frete;

  function formatarReal(valor) {
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  }

  function renderizarResumo() {
    const container = document.getElementById('resumoItens');

    if (carrinho.length === 0) {
      container.innerHTML = '<p class="resumo-vazio">Seu carrinho está vazio.</p>';
    } else {
      container.innerHTML = carrinho.map((item) => `
        <div class="resumo-item">
          <span class="nome">${item.name}</span>
          <span class="preco">${formatarReal(item.price)}</span>
        </div>
      `).join('');
    }

    document.getElementById('resumoSubtotal').textContent = formatarReal(subtotal);
    document.getElementById('resumoFrete').textContent = frete === 0 ? 'Grátis' : formatarReal(frete);
    document.getElementById('resumoTotal').textContent = formatarReal(total);
    document.getElementById('resumoTotalPix').textContent = formatarReal(totalPix);
    document.getElementById('pixValor').textContent = formatarReal(totalPix);
  }

  renderizarResumo();

  // ------------------------------------------------------------------
  // 2. Abas de pagamento
  // ------------------------------------------------------------------
  const tabBtns = document.querySelectorAll('.pagamento-tab-btn');
  const paineis = document.querySelectorAll('.pagamento-painel');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      paineis.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(btn.dataset.painel).classList.add('active');
    });
  });

  // ------------------------------------------------------------------
  // 3. Pix — gera o código real (usando pix.js) + QR code + copiar
  // ------------------------------------------------------------------
  const txid = 'PEDIDO' + Date.now().toString().slice(-10);
  const valorParaPix = totalPix > 0 ? totalPix : 0.01; // Pix exige valor > 0
  const codigoPix = gerarPayloadPix(valorParaPix, txid);

  document.getElementById('pixCodigo').value = codigoPix;

  if (window.QRCode) {
    new QRCode(document.getElementById('pixQrCode'), {
      text: codigoPix,
      width: 148,
      height: 148,
      colorDark: '#0a0a0a',
      colorLight: '#ffffff',
    });
  }

  document.getElementById('btnCopiarPix').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(codigoPix);
    } catch (err) {
      // Fallback pra navegadores/contextos sem permissão de clipboard
      const campo = document.getElementById('pixCodigo');
      campo.select();
      document.execCommand('copy');
    }
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Código copiado!';
    btn.classList.add('copiado');
    setTimeout(() => {
      btn.innerHTML = textoOriginal;
      btn.classList.remove('copiado');
    }, 2000);
  });

  document.getElementById('btnConfirmarPedido').addEventListener('click', () => {
    alert('Recebido! Assim que confirmarmos o Pix na conta, seu pedido entra em preparação.\n\n(Confirmação manual — combine com o cliente como avisar que pagou.)');
    localStorage.removeItem('sr_carrinho');
  });

//   Carrinho animação
  const cartao3d = document.getElementById('cartao3d');
  const inputNumero = document.getElementById('inputNumeroCartao');
  const inputNome = document.getElementById('inputNomeCartao');
  const inputValidade = document.getElementById('inputValidadeCartao');
  const inputCvv = document.getElementById('inputCvvCartao');

  const previewNumero = document.getElementById('previewNumero');
  const previewNome = document.getElementById('previewNome');
  const previewValidade = document.getElementById('previewValidade');
  const previewCvv = document.getElementById('previewCvv');

  inputNumero.addEventListener('input', () => {
    const digitos = inputNumero.value.replace(/\D/g, '').slice(0, 16);
    inputNumero.value = digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
    previewNumero.textContent = digitos.length
      ? inputNumero.value.padEnd(19, '•')
      : '•••• •••• •••• ••••';
  });

  inputNome.addEventListener('input', () => {
    previewNome.textContent = inputNome.value.trim() ? inputNome.value.toUpperCase() : 'NOME NO CARTÃO';
  });

  inputValidade.addEventListener('input', () => {
    let digitos = inputValidade.value.replace(/\D/g, '').slice(0, 4);
    if (digitos.length >= 3) {
      digitos = `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
    }
    inputValidade.value = digitos;
    previewValidade.textContent = digitos || 'MM/AA';
  });

  inputCvv.addEventListener('input', () => {
    inputCvv.value = inputCvv.value.replace(/\D/g, '').slice(0, 4);
    previewCvv.textContent = inputCvv.value ? inputCvv.value : '•••';
  });

  inputCvv.addEventListener('focus', () => cartao3d.classList.add('virado'));
  inputCvv.addEventListener('blur', () => cartao3d.classList.remove('virado'));

  document.getElementById('btnPagarCartao').addEventListener('click', () => {
    alert('Esse checkout de cartão ainda é só uma demonstração visual — nenhuma cobrança real foi feita.\n\nPra cobrar cartão de verdade, esse formulário precisa ser conectado a um gateway de pagamento (ex: Mercado Pago), que também cuida da segurança dos dados do cartão.');
  });
});