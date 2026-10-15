import importlib.util, unittest, pathlib
spec = importlib.util.spec_from_file_location("openai_tts", pathlib.Path(__file__).with_name("openai-tts.py")); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
class T(unittest.TestCase):
    def test_normalizacao(self):
        self.assertEqual(m.normalizar_pt("Custa R$ 59,90 e R59,90 dollars; enviou US$ 1.100 e 1.100 US dollars."), "Custa 59,90 reais e 59,90 reais; enviou 1.100 dólares e 1.100 dólares.")
        self.assertEqual(m.normalizar_pt("Almoço às 12h30, treino às 7h, reunião às 9h00, 1h de duração."), "Almoço às 12 e 30, treino às 7 horas, reunião às 9 horas, 1 hora de duração.")
        self.assertEqual(m.normalizar_pt("Fechado na segunda, 19/10. Vence em 05/11/2026. Placa 30/99 não é data."), "Fechado na segunda, 19 de outubro. Vence em 5 de novembro de 2026. Placa 30/99 não é data.")
        self.assertEqual(m.normalizar_pt("• Link: https://maps.google.com/?cid=123 • Telefone (92) 3644-7000"), "Link: Telefone (92) 3644-7000")
    def test_partes(self):
        texto = "Esta é uma frase de teste com algumas palavras. " * 30
        ps = m.partes(texto, 400)
        self.assertGreaterEqual(len(ps), 3)
        for p in ps: self.assertLessEqual(len(p), 400); self.assertTrue(p.endswith("."))
        self.assertEqual(m.partes("curto"), ["curto"])
if __name__ == "__main__": unittest.main(verbosity=0)
