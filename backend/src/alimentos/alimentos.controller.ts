import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AlimentosService } from "./alimentos.service.js";
import { RapidApiAlimentosService } from "./rapidapi-alimentos.service.js";
import { BuscarAlimentosDto } from "./dto/buscar-alimentos.dto.js";
import { CalcularAlimentosDto } from "./dto/calcular-alimentos.dto.js";
import type { AlimentoBusca, RefeicaoCalculada } from "./alimentos.types.js";

@Controller("alimentos")
export class AlimentosController {
  constructor(
    private readonly alimentosService: AlimentosService,
    private readonly rapidApi: RapidApiAlimentosService,
  ) {}

  @Get()
  buscar(@Query() query: BuscarAlimentosDto): Promise<AlimentoBusca[]> {
    return this.alimentosService.buscar(query.busca);
  }

  // Consulta separada: não mistura IDs ou dados da fonte PostgreSQL com a externa.
  @Get("rapidapi")
  buscarRapidApi(@Query() query: BuscarAlimentosDto): Promise<AlimentoBusca[]> {
    return this.rapidApi.buscar(query.busca);
  }

  @Post("rapidapi/calcular")
  calcularRapidApi(
    @Body() body: CalcularAlimentosDto,
  ): Promise<RefeicaoCalculada> {
    return this.rapidApi.calcular(body);
  }

  @Post("calcular")
  calcular(@Body() body: CalcularAlimentosDto): Promise<RefeicaoCalculada> {
    return this.alimentosService.calcular(body);
  }
}
