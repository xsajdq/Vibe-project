export function PrivacyNotice() {
  return (
    <aside className="notice" aria-label="Informacja o przetwarzaniu danych">
      <span className="label">Prywatność</span>
      <p>
        Tekst wyodrębniony z PDF (oraz obrazy stron bez warstwy tekstowej) jest wysyłany do
        zewnętrznego API AI (Google Gemini) w celu analizy. W darmowym planie dostawca może
        wykorzystywać przesłane dane do ulepszania usług — nie wgrywaj dokumentów poufnych ani
        danych osobowych. Wyniki zapisujemy wyłącznie lokalnie w Twojej przeglądarce.
      </p>
    </aside>
  );
}
