import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AlimentoBusca, RefeicaoCalculada } from './alimentos.types.js';
import { normalizarTermo } from './alimentos.repository.js';
import type { CalcularAlimentosDto } from './dto/calcular-alimentos.dto.js';

type JsonObject = Record<string, unknown>;

function objeto(dado: unknown): dado is JsonObject {
  return typeof dado === 'object' && dado !== null && !Array.isArray(dado);
}

function numero(dado: unknown): number | null {
  if (dado === null || dado === undefined || dado === '') return null;
  const convertido = Number(dado);
  return Number.isFinite(convertido) ? convertido : null;
}

/**
 * Cliente de API externa, executado SOMENTE no backend.
 * O formato das rotas e dos dados segue src/services/nutricao.js da versão original.
 * A integração precisa ser testada com a assinatura real da conta RapidAPI.
 */
@Injectable()
export class RapidApiAlimentosService {
  private get configuracao(): { key: string; host: string } {
    const key = process.env.RAPIDAPI_KEY?.trim();
    const host = (process.env.RAPIDAPI_HOST || 'taco-api-br1.p.rapidapi.com').trim();
    if (!key) {
      throw new ServiceUnavailableException('Configure RAPIDAPI_KEY no backend/.env.');
    }
    // O host nunca vem da query do usuário (evita SSRF).
    if (!/^[a-z0-9.-]+$/i.test(host)) {
      throw new ServiceUnavailableException('RAPIDAPI_HOST inválido no backend/.env.');
    }
    return { key, host };
  }

  private async solicitar(caminho: string, metodo: 'GET' | 'POST', body?: unknown): Promise<unknown> {
    const { key, host } = this.configuracao;
    const url = new URL(caminho, `https://${host}`);
    let resposta: Response;
    try {
      resposta = await fetch(url, {
        method: metodo,
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': host,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (erro) {
      if (erro instanceof Error && (erro.name === 'TimeoutError' || erro.name === 'AbortError')) {
        throw new GatewayTimeoutException('A RapidAPI demorou para responder.');
      }
      throw new BadGatewayException('Não foi possível conectar à RapidAPI.');
    }

    if (resposta.status === 429) {
      throw new HttpException('Limite de consultas da RapidAPI atingido.', 429);
    }
    if (resposta.status === 401 || resposta.status === 403) {
      throw new ServiceUnavailableException('A chave não tem acesso a esta API. Confira a assinatura no RapidAPI.');
    }
    if (!resposta.ok) {
      throw new BadGatewayException(`RapidAPI retornou HTTP ${resposta.status}. Confira o endpoint e o plano.`);
    }
    try {
      return await resposta.json();
    } catch {
      throw new BadGatewayException('Resposta JSON inválida da RapidAPI.');
    }
  }

  async buscar(busca: string): Promise<AlimentoBusca[]> {
    const termos = normalizarTermo(busca);
    if (termos.length === 0) return [];

    // A versão JS original usa /foods/?q=...&limit=100 na TACO RapidAPI.
    const consultar = (palavra: string) => this.solicitar(
      `/foods/?q=${encodeURIComponent(palavra)}&limit=100`, 'GET',
    );
    let dados = await consultar(termos[0]);
    if (objeto(dados) && Array.isArray(dados.results) && dados.results.length === 0) {
      // Mantém compatibilidade caso a API externe diferencie maiúsculas.
      const primeira = termos[0];
      dados = await consultar(primeira[0].toUpperCase() + primeira.slice(1));
    }
    if (!objeto(dados) || !Array.isArray(dados.results)) {
      throw new BadGatewayException('O formato da resposta de alimentos da RapidAPI mudou.');
    }

    const porId = new Map<number, AlimentoBusca>();
    for (const registro of dados.results) {
      if (!objeto(registro)) continue;
      const id = numero(registro.id);
      const descricao = registro.description;
      if (id === null || !Number.isInteger(id) || id < 1 || typeof descricao !== 'string') continue;
      const normalizada = normalizarTermo(descricao).join(' ');
      if (!termos.every((termo) => normalizada.includes(termo))) continue;
      porId.set(id, { id, descricao, kcal: numero(registro.kcal) });
    }
    return [...porId.values()]
      .sort((a, b) =>
        Number(!normalizarTermo(a.descricao).join(' ').startsWith(termos[0])) -
        Number(!normalizarTermo(b.descricao).join(' ').startsWith(termos[0])) ||
        a.descricao.localeCompare(b.descricao, 'pt-BR'),
      )
      .slice(0, 8);
  }

  async calcular(dados: CalcularAlimentosDto): Promise<RefeicaoCalculada> {
    const resultado = await this.solicitar('/foods/calculate-meal', 'POST', { items: dados.items });
    if (!objeto(resultado) || !Array.isArray(resultado.items) || !objeto(resultado.totals) ||
        !objeto(resultado.totals.macros) || !objeto(resultado.totals.micros)) {
      throw new BadGatewayException('O formato do cálculo da RapidAPI mudou.');
    }
    // A resposta da API externa precisa ser validada com uma chave real, incluindo
    // os nomes/unidades dos micronutrientes, antes de ser usada em produção.
    return resultado as unknown as RefeicaoCalculada;
  }
}
