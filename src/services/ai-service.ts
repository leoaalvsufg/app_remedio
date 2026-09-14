import { supabase } from '@/lib/supabase';

export type AssistantMode = 'leaflet' | 'interactions' | 'timing' | 'chat';

export interface AssistantResponse {
  answer: string;
  disclaimer: string;
  mode: AssistantMode;
  model: string;
}

export const MEDICAL_DISCLAIMER =
  'Não use esta resposta para se automedicar. Medicamentos podem causar reações adversas, intoxicações, contraindicações e interações graves. Consulte obrigatoriamente um médico ou farmacêutico antes de iniciar, interromper, substituir ou alterar dose, horário ou forma de uso de qualquer medicamento. Em sinais de emergência, procure atendimento imediato ou ligue 192 (SAMU).';

export async function askHealthAssistant(input: {
  mode: AssistantMode;
  medicineId?: string;
  question?: string;
  imageBase64?: string;
  imageMimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}) {
  const { data, error } = await supabase.functions.invoke<AssistantResponse>('health-assistant', {
    body: input,
  });
  if (error) {
    const status = error.context instanceof Response ? error.context.status : 0;
    if (status === 401) throw new Error('Entre na sua conta para usar o assistente.');
    if (status === 429) throw new Error('Limite de consultas atingido. Aguarde um pouco.');
    throw new Error('O assistente está indisponível no momento. Tente novamente mais tarde.');
  }
  if (!data?.answer) throw new Error('O assistente não retornou uma resposta válida.');
  return { ...data, disclaimer: MEDICAL_DISCLAIMER };
}
