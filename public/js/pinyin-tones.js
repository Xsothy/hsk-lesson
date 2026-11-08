/* Tone-coloured pinyin for JS-rendered rows (same markup as App\Support\Pinyin::toneHtml): one <span class="tone-N"> per syllable. */
(function () {
  var MARKS = { 1: 'āēīōūǖĀĒĪŌŪǕ', 2: 'áéíóúǘÁÉÍÓÚǗ', 3: 'ǎěǐǒǔǚǍĚǏǑǓǙ', 4: 'àèìòùǜÀÈÌÒÙǛ' };
  function tone(s) { for (var t = 1; t <= 4; t++) for (var i = 0; i < s.length; i++) if (MARKS[t].indexOf(s[i]) >= 0) return t; return 5; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // Split "xuéxí" into syllables at each vowel group that follows a consonant boundary; good enough for colouring.
  var SYL = /(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(ng|n(?![aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]))?/gi;
  function html(py) {
    py = String(py || '').trim();
    if (!py) return '';
    return py.split(/(\s+|\s*[·,;\/]\s*)/).map(function (part, i) {
      if (i % 2) return esc(part);
      if (!part) return "";
      var syl = part.match(SYL);
      if (!syl || syl.join('') !== part) return '<span class="tone-' + tone(part) + '">' + esc(part) + '</span>';
      return syl.map(function (s) { return '<span class="tone-' + tone(s) + '">' + esc(s) + '</span>'; }).join('');
    }).join('');
  }
  window.HSK_PINYIN = { html: html, tone: tone };
})();
