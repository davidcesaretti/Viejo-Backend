/**
 * Datos disponibles en plantillas HBS de correo.
 * Añadir campos según las plantillas que uses.
 */
export interface TemplateData {
  firstName?: string;
  token?: string;
  email?: string;
  url_base?: string;
  year?: string;
  companyName?: string;
  question?: string;
  answer?: string;
  password?: string;
  logo_url?: string;
  currentEmail?: string;
  newEmail?: string;
  [key: string]: unknown;
}
