@extends('layouts.app')
@section('title', 'HSK checker')
@push('head')<meta name="csrf-token" content="{{ csrf_token() }}"><link rel="stylesheet" href="/css/tools.css">@endpush
@section('content')
<div class="tool" data-tool="hsk" data-url="{{ url('/tools/hsk-check') }}">
  <a class="back" href="{{ route('tools') }}">‹ Tools</a>
  <x-page-head eyebrow="Tools" title="HSK checker" />
  <p class="muted">Paste Chinese text to see which HSK level each word belongs to (<span data-version-label>HSK 2.0</span>; change in Settings).</p>
  <label class="tool-label" for="hsk-in">Chinese text</label>
  <textarea id="hsk-in" class="tool-field" rows="5" maxlength="{{ $max }}" lang="zh" placeholder="我今天学习汉语。"></textarea>
  <div class="tool-actions"><button type="button" class="btn btn-primary" data-run>Check</button><span class="muted" data-status role="status"></span></div>
  <section data-result hidden>
    <h2>Highlighted text</h2>
    <p class="hsk-text zh" data-text lang="zh"></p>
    <h2>Levels</h2>
    <ul class="hsk-stats" data-stats></ul>
    <h2>Not in the list</h2>
    <p class="muted" data-unknown-empty hidden>Everything was found in the HSK lists.</p>
    <p class="hsk-unknown" data-unknown></p>
  </section>
</div>
@endsection
@push('scripts')<script src="/js/store.js"></script><script src="/js/tools.js"></script>@endpush
