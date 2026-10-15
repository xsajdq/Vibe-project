# AI_LOG — praca z narzędziami AI

## Narzędzia

- **Claude Code** (Anthropic) — agent w sesji chmurowej z dostępem do repozytorium: projekt architektury,
  generowanie kodu, testów, CI i dokumentacji, uruchamianie lint/testów/buildu oraz testu E2E
  w przeglądarce (Playwright + Chromium).
- **Playwright** (sterowany przez agenta) — przejście pełnego przepływu na pliku testowym
  `Test_PDF_Insight_umowa_14-2026.pdf`, zrzuty ekranu (desktop i 360 px), sprawdzenie, że strona
  nie przewija się w poziomie, oraz przypadków błędów (plik .txt, fałszywy PDF).
- **Dokumentacja Google Gemini API** (pobierana przez agenta) — weryfikacja aktualnych modeli,
  darmowego limitu i formatu structured output.

Każdy fragment kodu przejrzałem i rozumiem — opis decyzji w [README.md](README.md#najważniejsze-decyzje).

## Kluczowe prompty

1. **Brief jako kontekst + cel (początek pracy).**

   > „To jest projekt do pracy na stanowisko vibe coder. […] Twoim zadaniem jest zbudowanie aplikacji
   > webowej PDF Insight, która wczytuje plik PDF, tworzy jego krótkie podsumowanie i zamienia treść
   > w uporządkowane dane JSON. […]” + pełna treść briefu (zakres F-01…F-10, stack, schemat danych,
   > standardy, kryteria oceny) + plik testowy PDF.

   Cel: przekazać AI kompletne wymagania naraz, zamiast budować aplikację kawałkami. Kryteria oceny
   w briefie pomogły ustalić priorytety (najpierw MUST i bezpieczeństwo).

<!-- Uzupełnij kolejne prompty, których użyłeś w dalszej pracy (2–4), np. poprawki UI, zmiany po
     przetestowaniu demo z prawdziwym kluczem, prośby o wyjaśnienie fragmentów kodu. -->

## Gdzie AI się pomyliło i jak to poprawiłem

| #   | Błąd AI                                                                                                                                                                                                         | Jak wykryto                                                              | Poprawka                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Ekstrakcja tekstu rozbijała polskie słowa** — fragmenty z `pdf.js` łączone spacją dawały „wy łą cznie”, „s ą”.                                                                                                | Test E2E: podgląd tekstu wysyłanego do modelu.                           | Sklejanie fragmentów wg pozycji na stronie (spacja tylko przy faktycznej przerwie) — `joinTextItems()` + testy.                                                         |
| 2   | **Brak nagłówka CORS w odpowiedzi 200** — nagłówki były dodawane tylko do błędów i preflightu, więc przeglądarka zablokowałaby poprawny wynik.                                                                  | Test jednostkowy Workera.                                                | Przekazanie nagłówków CORS do odpowiedzi z wynikiem.                                                                                                                    |
| 3   | **Licznik zdań traktował „S.A.” zawsze jako skrót**, więc „…Kwadrat Software S.A. Umowa…” liczyło się jako jedno zdanie — poprawne podsumowania byłyby odrzucane i niepotrzebnie generowane ponownie.           | Test jednostkowy na przykładzie z briefu („Przykład sp. z o.o. Okres…”). | Dwie listy skrótów: „wewnętrzne” (ul., np., nr — nigdy nie kończą zdania) i „końcowe” (S.A., r., zł — kończą zdanie przed wielką literą).                               |
| 4   | **Weryfikacja kwot usuwała prawdziwe dane ze skanu** — kwota z aneksu (strona-skan, 13 100 PLN) nie występuje w warstwie tekstowej, więc filtr uznałby ją za halucynację.                                       | Analiza pliku testowego (strona 11 to skan).                             | Przy dokumentach ze skanami kwoty spoza tekstu są zachowywane i oznaczane ostrzeżeniem w UI.                                                                            |
| 5   | **Nieaktualny model** — pierwotne założenie `gemini-2.5-flash`; dokumentacja pokazała, że rodzina 2.5 jest dostępna tylko dla dotychczasowych użytkowników.                                                     | Sprawdzenie aktualnej dokumentacji modeli.                               | `gemini-3.8-flash` przez endpoint zgodny z OpenAI; model i dostawca konfigurowalne zmiennymi. Fallback na `json_object`, gdy dostawca odrzuci `json_schema` (HTTP 400). |
| 6   | **Konflikty zależności** — najnowszy `wrangler` wymagał `@cloudflare/workers-types` v5; `vitest` 3 miał podatności (`npm audit`), a `vitest` 4 wywoływał błąd instalatora npm.                                  | `npm install` / `npm audit`.                                             | Przypięte wersje, `vitest` 5 — `npm audit`: 0 podatności.                                                                                                               |
| 7   | **Niewidoczne twarde spacje (U+00A0) wpisane dosłownie w wyrażenia regularne.**                                                                                                                                 | ESLint (`no-irregular-whitespace`).                                      | Zamiana na sekwencje ` ` / ` `.                                                                                                                                         |
| 8   | **Mock w teście współdzielił jeden obiekt `Response`** (drugi odczyt ciała się nie udawał), co przy okazji ujawniło brak obsługi nieczytelnej (nie-JSON) odpowiedzi dostawcy — kończyła się ogólnym błędem 500. | Nieoczekiwany status 500 w teście.                                       | Nowa odpowiedź przy każdym wywołaniu mocka + jawna obsługa nie-JSON-owej odpowiedzi dostawcy (502 z komunikatem).                                                       |

## Wnioski

- Najwięcej realnych błędów wyłapały **testy uruchamiane od razu po wygenerowaniu kodu** oraz
  **test E2E na prawdziwym pliku** — kod „wyglądał” poprawnie, a dopiero dane pokazały problemy
  (polskie znaki, skany).
- Przy pracy z AI opłaca się weryfikować fakty zależne od czasu (wersje bibliotek, nazwy modeli)
  w aktualnej dokumentacji zamiast polegać na wiedzy modelu.
