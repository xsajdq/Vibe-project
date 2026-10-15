export function PrivacyNotice() {
  return (
    <p className="notice" role="note">
      <strong>Informacja o przetwarzaniu:</strong> tekst wyodrębniony z PDF (oraz obrazy stron bez
      warstwy tekstowej) jest wysyłany do zewnętrznego API AI (Google Gemini) w celu analizy. W
      darmowym planie dostawca może wykorzystywać przesłane dane do ulepszania usług — nie wgrywaj
      dokumentów poufnych ani danych osobowych. Wyniki zapisujemy wyłącznie lokalnie w Twojej
      przeglądarce.
    </p>
  );
}
