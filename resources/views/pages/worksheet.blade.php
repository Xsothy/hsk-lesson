@extends('layouts.app')
@section('title', 'Worksheet PDF')
@push('head')<link rel="stylesheet" href="/css/tools.css">@endpush
@section('content')
@php
  $src = old('source', $source);
  $v = (int) old('version', $pre['version'] ?? 2);
  $lv = (int) old('level', $pre['level'] ?? 1);
@endphp
<div class="tool" data-tool="worksheet">
  <a class="back" href="{{ route('tools') }}">‹ Tools</a>
  <h1>Worksheet PDF</h1>
  <p class="muted">Printable stroke-order practice sheets: a model character, light copies to trace, then empty squares.</p>

  @if ($errors->any())
    <p class="tool-note" role="alert">{{ $errors->first() }}</p>
  @endif

  <form method="get" action="{{ route('worksheet.pdf') }}" target="_blank" data-worksheet-form>
    <input type="hidden" name="form" value="1">

    <span class="tool-label" id="ws-src-l">Characters from</span>
    <div class="tool-seg" role="radiogroup" aria-labelledby="ws-src-l">
      @foreach (['text' => 'Typed list', 'lesson' => 'A lesson', 'hsk' => 'HSK level'] as $val => $label)
        <label><input type="radio" name="source" value="{{ $val }}" @checked($src === $val)><span>{{ $label }}</span></label>
      @endforeach
    </div>

    <div data-src="text" @if($src !== 'text') hidden @endif>
      <label class="tool-label" for="ws-chars">Characters <span class="muted">(up to {{ $max }})</span></label>
      <textarea id="ws-chars" name="chars" class="tool-field" rows="3" maxlength="500" lang="zh" placeholder="你好学习中文">{{ old('chars', $pre['chars'] ?? '') }}</textarea>
    </div>

    <div data-src="lesson" @if($src !== 'lesson') hidden @endif>
      <label class="tool-label" for="ws-lesson">Lesson</label>
      <select id="ws-lesson" name="lesson" class="tool-field">
        @foreach ($lessons as $l)
          <option value="{{ $l->slug }}" @selected(old('lesson', $pre['lesson'] ?? null) === $l->slug)>Lesson {{ $l->number }} · {{ $l->en_title ?: $l->title }}</option>
        @endforeach
      </select>
    </div>

    <div data-src="hsk" @if($src !== 'hsk') hidden @endif>
      <div class="tool-row">
        <div>
          <label class="tool-label" for="ws-version">HSK</label>
          <select id="ws-version" name="version" class="tool-field">
            <option value="2" @selected($v === 2)>HSK 2.0</option>
            <option value="3" @selected($v === 3)>HSK 3.0</option>
          </select>
        </div>
        <div>
          <label class="tool-label" for="ws-level">Level</label>
          <select id="ws-level" name="level" class="tool-field">
            @foreach ($levels[3] as $it)
              <option value="{{ $it['level'] }}" @selected($lv === $it['level'])>{{ $it['label'] }}</option>
            @endforeach
          </select>
        </div>
        <div>
          <label class="tool-label" for="ws-set">Set <span class="muted">(optional)</span></label>
          <input id="ws-set" name="set" type="number" min="1" class="tool-field" value="{{ old('set', $pre['set'] ?? '') }}" placeholder="All">
        </div>
      </div>
      <p class="muted">Without a set, the first {{ $max }} characters of the level.</p>
    </div>

    <span class="tool-label" id="ws-grid-l">Grid</span>
    <div class="tool-seg" role="radiogroup" aria-labelledby="ws-grid-l">
      @foreach (['tian' => '田 Tian', 'mi' => '米 Mi', 'plain' => 'Plain'] as $val => $label)
        <label><input type="radio" name="grid" value="{{ $val }}" @checked(old('grid', 'tian') === $val)><span>{{ $label }}</span></label>
      @endforeach
    </div>

    <label class="tool-label" for="ws-trace">Tracing copies</label>
    <select id="ws-trace" name="trace" class="tool-field">
      @for ($i = 0; $i <= 11; $i++)
        <option value="{{ $i }}" @selected((int) old('trace', 3) === $i)>{{ $i }}</option>
      @endfor
    </select>

    <div class="tool-seg">
      <label><input type="checkbox" name="pinyin" value="1" @checked(old('pinyin', '1'))><span>Pinyin</span></label>
      <label><input type="checkbox" name="english" value="1" @checked(old('english', '1'))><span>English</span></label>
    </div>

    <div class="tool-actions">
      <button type="submit" class="btn btn-primary">Make PDF</button>
      <span class="muted">Opens in a new tab · A4</span>
    </div>
  </form>
  <p class="muted" style="margin-top:24px">Stroke data from <a href="https://github.com/skishore/makemeahanzi">Make Me a Hanzi</a> (Arphic Public License).</p>
</div>
@endsection
@push('scripts')
<script>
(() => {
  const form = document.querySelector('[data-worksheet-form]');
  const sync = () => {
    const src = form.querySelector('input[name=source]:checked')?.value;
    form.querySelectorAll('[data-src]').forEach(el => {
      el.hidden = el.dataset.src !== src;
      el.querySelectorAll('input,select,textarea').forEach(f => { f.disabled = el.hidden; });
    });
  };
  form.addEventListener('change', e => { if (e.target.name === 'source') sync(); });
  sync();
})();
</script>
@endpush
