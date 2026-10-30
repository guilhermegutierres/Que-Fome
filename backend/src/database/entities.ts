import { EntitySchema } from "typeorm";
import type { AlimentoRow } from "../alimentos/alimentos.types.js";

// Mapeamentos das colunas usadas pela aplicação. auth e alimentos são parciais;
// synchronize:false também por entidade evita alterar o banco legado.
export interface UserEntity {
  id: string;
  email: string;
  encrypted_password: string | null;
  deleted_at: Date | null;
  banned_until: Date | null;
  profile?: ProfileEntity;
  identities?: IdentityEntity[];
  sessions?: SessionEntity[];
}
export interface IdentityEntity {
  id: string;
  user_id: string;
  provider_id: string;
  provider: string;
  identity_data: Record<string, unknown>;
  user?: UserEntity;
}
export interface ProfileEntity {
  id: string;
  nome: string;
  avatar_path: string | null;
  created_at: Date;
  updated_at: Date;
  user?: UserEntity;
  receitas?: RecipeEntity[];
}
export interface SessionEntity {
  token_hash: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
  user?: UserEntity;
}
export interface FoodEntity extends AlimentoRow {
  id: string;
  ingredientes?: IngredientEntity[];
}
export interface RecipeEntity {
  id: string;
  tipo: "oficial" | "usuario";
  autor_id: string | null;
  titulo: string;
  categoria: string;
  descricao: string;
  descricao_completa: string;
  tempo_minutos: number;
  porcoes: number | null;
  dificuldade: string;
  custo: string | null;
  imagem_path: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  autor?: ProfileEntity | null;
  ingredientes?: IngredientEntity[];
  etapas?: StepEntity[];
}
export interface IngredientEntity {
  receita_id: string;
  ordem: number;
  nome: string;
  quantidade: string;
  taco_id: number | null;
  gramas: string | null;
  texto_exibicao: string | null;
  gramas_estimadas: boolean;
  receita?: RecipeEntity;
  alimento?: FoodEntity | null;
}
export interface StepEntity {
  receita_id: string;
  ordem: number;
  instrucao: string;
  receita?: RecipeEntity;
}

export const User = new EntitySchema<UserEntity>({
  name: "User",
  schema: "auth",
  tableName: "users",
  synchronize: false,
  columns: {
    id: { type: "uuid", primary: true },
    email: { type: "varchar", nullable: true },
    encrypted_password: { type: "varchar", nullable: true, select: false },
    deleted_at: { type: "timestamptz", nullable: true, select: false },
    banned_until: { type: "timestamptz", nullable: true, select: false },
  },
  relations: {
    profile: { type: "one-to-one", target: "Profile", inverseSide: "user" },
    identities: {
      type: "one-to-many",
      target: "Identity",
      inverseSide: "user",
    },
    sessions: { type: "one-to-many", target: "Session", inverseSide: "user" },
  },
});
export const Identity = new EntitySchema<IdentityEntity>({
  name: "Identity",
  schema: "auth",
  tableName: "identities",
  synchronize: false,
  columns: {
    id: { type: "uuid", primary: true },
    user_id: { type: "uuid" },
    provider_id: { type: "text" },
    provider: { type: "text" },
    identity_data: { type: "jsonb", select: false },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      inverseSide: "identities",
      joinColumn: { name: "user_id" },
      onDelete: "CASCADE",
    },
  },
});
export const Profile = new EntitySchema<ProfileEntity>({
  name: "Profile",
  schema: "public",
  tableName: "profiles",
  synchronize: false,
  columns: {
    id: { type: "uuid", primary: true },
    nome: { type: "text" },
    avatar_path: { type: "text", nullable: true },
    created_at: { type: "timestamptz", default: () => "now()" },
    updated_at: { type: "timestamptz", default: () => "now()" },
  },
  relations: {
    user: {
      type: "one-to-one",
      target: "User",
      inverseSide: "profile",
      joinColumn: { name: "id" },
      onDelete: "CASCADE",
    },
    receitas: { type: "one-to-many", target: "Recipe", inverseSide: "autor" },
  },
});
export const Session = new EntitySchema<SessionEntity>({
  name: "Session",
  schema: "public",
  tableName: "app_sessions",
  synchronize: false,
  columns: {
    token_hash: { type: "text", primary: true, select: false },
    user_id: { type: "uuid" },
    expires_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", default: () => "now()" },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      inverseSide: "sessions",
      joinColumn: { name: "user_id" },
      onDelete: "CASCADE",
    },
  },
});
export const Food = new EntitySchema<FoodEntity>({
  name: "Food",
  schema: "public",
  tableName: "alimentos",
  synchronize: false,
  columns: {
    id: { type: "bigint", primary: true },
    taco_id: { type: "integer", unique: true },
    descricao: { type: "text" },
    energia_kcal: { type: "numeric", nullable: true },
    proteina_g: { type: "numeric", nullable: true },
    carboidratos_g: { type: "numeric", nullable: true },
    lipidios_g: { type: "numeric", nullable: true },
    fibras_g: { type: "numeric", nullable: true },
    calcio_mg: { type: "numeric", nullable: true },
    ferro_mg: { type: "numeric", nullable: true },
    fosforo_mg: { type: "numeric", nullable: true },
  },
  relations: {
    ingredientes: {
      type: "one-to-many",
      target: "Ingredient",
      inverseSide: "alimento",
    },
  },
});
export const Recipe = new EntitySchema<RecipeEntity>({
  name: "Recipe",
  schema: "public",
  tableName: "receitas",
  synchronize: false,
  columns: {
    id: { type: "uuid", primary: true, default: () => "gen_random_uuid()" },
    tipo: { type: "text", default: "usuario" },
    autor_id: { type: "uuid", nullable: true },
    titulo: { type: "text" },
    categoria: { type: "text" },
    descricao: { type: "text", default: "" },
    descricao_completa: { type: "text", default: "" },
    tempo_minutos: { type: "integer" },
    porcoes: { type: "integer", nullable: true },
    dificuldade: { type: "text" },
    custo: { type: "text", nullable: true },
    imagem_path: { type: "text", nullable: true },
    tags: { type: "text", array: true, default: () => "'{}'::text[]" },
    created_at: { type: "timestamptz", default: () => "now()" },
    updated_at: { type: "timestamptz", default: () => "now()" },
  },
  relations: {
    autor: {
      type: "many-to-one",
      target: "Profile",
      inverseSide: "receitas",
      joinColumn: { name: "autor_id" },
      nullable: true,
      onDelete: "CASCADE",
    },
    ingredientes: {
      type: "one-to-many",
      target: "Ingredient",
      inverseSide: "receita",
    },
    etapas: { type: "one-to-many", target: "Step", inverseSide: "receita" },
  },
});
export const Ingredient = new EntitySchema<IngredientEntity>({
  name: "Ingredient",
  schema: "public",
  tableName: "receita_ingredientes",
  synchronize: false,
  columns: {
    receita_id: { type: "uuid", primary: true },
    ordem: { type: "integer", primary: true },
    nome: { type: "text" },
    quantidade: { type: "text" },
    taco_id: { type: "integer", nullable: true },
    gramas: { type: "numeric", nullable: true },
    texto_exibicao: { type: "text", nullable: true },
    gramas_estimadas: { type: "boolean", default: false },
  },
  relations: {
    receita: {
      type: "many-to-one",
      target: "Recipe",
      inverseSide: "ingredientes",
      joinColumn: { name: "receita_id" },
      onDelete: "CASCADE",
    },
    alimento: {
      type: "many-to-one",
      target: "Food",
      inverseSide: "ingredientes",
      joinColumn: { name: "taco_id", referencedColumnName: "taco_id" },
      nullable: true,
      onDelete: "SET NULL",
    },
  },
});
export const Step = new EntitySchema<StepEntity>({
  name: "Step",
  schema: "public",
  tableName: "receita_etapas",
  synchronize: false,
  columns: {
    receita_id: { type: "uuid", primary: true },
    ordem: { type: "integer", primary: true },
    instrucao: { type: "text" },
  },
  relations: {
    receita: {
      type: "many-to-one",
      target: "Recipe",
      inverseSide: "etapas",
      joinColumn: { name: "receita_id" },
      onDelete: "CASCADE",
    },
  },
});
export const DATABASE_ENTITIES = [
  User,
  Identity,
  Profile,
  Session,
  Food,
  Recipe,
  Ingredient,
  Step,
];
