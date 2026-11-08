@extends('layouts.app')
@section('title', 'Zodiac')
@push('head')<meta name="csrf-token" content="{{ csrf_token() }}"><link rel="stylesheet" href="/css/tools.css">@endpush
@section('content')
<div class="tool" data-tool="zodiac" data-url="{{ url('/tools/zodiac') }}">
  <a class="back" href="{{ route('tools') }}">‹ Tools</a>
  <x-page-head eyebrow="Tools" title="Chinese zodiac" />
  <p class="muted">The zodiac year starts at Chinese New Year, not on 1 January. Dates 1900–2100.</p>
  <label class="tool-label" for="zd-in">Birth date</label>
  <div class="tool-row">
    <input id="zd-in" class="tool-field" type="date" min="1900-01-01" max="2100-12-31">
    <button type="button" class="btn btn-primary" data-run>Find</button>
  </div>
  <p class="muted" data-status role="status"></p>
  <section data-result hidden>
    <p class="name-big zh" data-big lang="zh"></p>
    <p data-text></p>
    <p class="muted" data-note></p>
  </section>
</div>
@endsection
@push('scripts')<script src="/js/tools.js"></script>@endpush
