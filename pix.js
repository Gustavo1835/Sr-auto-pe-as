
const CONFIG_PIX = {
  // TODO: troque pela sua chave aleatória (EVP) gerada no app do Nubank.
  // Formato de uma chave EVP: algo como "123e4567-e89b-12d3-a456-426614174000"
  chave: '11993344138',
  nomeRecebedor: 'SR Autopecas', 
  cidade: 'Sao Paulo',           
};

function limparTexto(txt, tamanhoMax) {
  const semAcento = (txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, '')   // só letras/números/espaço
    .toUpperCase()
    .trim();
  return semAcento.slice(0, tamanhoMax);
}

function campo(id, valor) {
  const tamanho = String(valor.length).padStart(2, '0');
  return `${id}${tamanho}${valor}`;
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — é o algoritmo que o
// padrão BR Code do Banco Central exige pro campo final de checksum.
function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o payload Pix completo (o texto do "copia e cola").
 * @param {number} valor - valor da cobrança, ex: 189.90
 * @param {string} txid - identificador do pedido (só letras/números, até 25 chars)
 */
function gerarPayloadPix(valor, txid) {
  const chave = CONFIG_PIX.chave.trim();
  const nome = limparTexto(CONFIG_PIX.nomeRecebedor, 25) || 'SR AUTOPECAS';
  const cidade = limparTexto(CONFIG_PIX.cidade, 15) || 'SAO PAULO';
  const txidTratado = (txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';
  const valorFormatado = Number(valor).toFixed(2);

  const merchantAccountInfo =
    campo('00', 'br.gov.bcb.pix') +
    campo('01', chave);

  let payload =
    campo('00', '01') +                    // Payload Format Indicator
    campo('26', merchantAccountInfo) +      // Merchant Account Info (Pix)
    campo('52', '0000') +                   // Merchant Category Code
    campo('53', '986') +                    // Moeda: Real (BRL)
    campo('54', valorFormatado) +           // Valor da cobrança
    campo('58', 'BR') +                     // País
    campo('59', nome) +                     // Nome do recebedor
    campo('60', cidade) +                   // Cidade do recebedor
    campo('62', campo('05', txidTratado));  // Identificador da transação

  payload += '6304'; // ID + tamanho do campo de CRC (o valor vem já em seguida)
  const crc = crc16(payload);

  return payload + crc;
}