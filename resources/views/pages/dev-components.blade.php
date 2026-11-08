@extends('layouts.app')
@section('title', 'Components')
@section('content')
<div class="dev">
<h1>Components</h1>
<h2>chip</h2>
<div class="row"><x-chip>Default</x-chip><x-chip :active="true">Active</x-chip><x-chip tone="red">Red</x-chip><x-chip tone="green">Green</x-chip><x-chip tone="gold">Gold</x-chip><x-chip tone="blue">Blue</x-chip><x-chip href="#">Link</x-chip></div>

<h2>stat-card</h2>
<div class="grid"><x-stat-card value="12" label="Cards due" tone="red"/><x-stat-card value="5/10" label="Characters today" tone="green" hint="Goal 10"/><x-stat-card value="7" label="Day streak" tone="gold"/><x-stat-card value="398" label="Words"/></div>

<h2>char-tile</h2>
<div class="row">
  <x-char-tile c="学" p="xué" m="study" :tone="2" dot="known"/>
  <x-char-tile c="你" p="nǐ" m="you" :tone="3" dot="learning"/>
  <x-char-tile c="妈" p="mā" m="mom" :tone="1" dot="new"/>
  <x-char-tile c="是" p="shì" :tone="4" variant="compact"/>
  <x-char-tile c="好" p="hǎo" m="good" :large="true" href="{{ route('char', '好') }}"/>
</div>

<h2>word-row</h2>
<div class="stack">
  <x-word-row :word="['hanzi'=>'学习','pinyin'=>'xuéxí','english'=>'to study','tone'=>2]"/>
  <x-word-row :word="['hanzi'=>'老师','pinyin'=>'lǎoshī','english'=>'teacher']" :audio="false"/>
</div>

<h2>quiz-option</h2>
<div class="stack">
  <x-quiz-option label="Idle" key="A"/><x-quiz-option label="Selected" state="selected" key="B"/>
  <x-quiz-option label="Correct" state="correct" key="C"/><x-quiz-option label="Wrong" state="wrong" key="D"/>
  <x-quiz-option label="Disabled" state="disabled"/>
</div>

<h2>dialogue-bubble</h2>
<div class="stack">
  <x-dialogue-bubble speaker="A" zh="你好，你叫什么名字？" pinyin="Nǐ hǎo, nǐ jiào shénme míngzi?" en="Hello, what is your name?"/>
  <x-dialogue-bubble speaker="B" side="right" zh="我叫李明。" pinyin="Wǒ jiào Lǐ Míng." en="My name is Li Ming."/>
</div>

<h2>ruby-line</h2>
@php
  $tk = fn ($zh, $py = null, $tones = [], $en = null) => ['zh' => $zh, 'pinyin' => $py, 'vocab' => $en ? ['e' => $en] : null,
      'syllables' => $py ? array_map(fn ($s, $t) => ['s' => $s, 't' => $t], \App\Services\RubyTokens::syllables($py, mb_strlen($zh)), $tones) : []];
  $demo = [$tk('你好', 'nǐ hǎo', [3, 3], 'hello'), $tk('！'), $tk('你', 'nǐ', [3], 'you'), $tk('叫', 'jiào', [4], 'to be called'),
      $tk('什么', 'shénme', [2, 5], 'what'), $tk('名字', 'míngzi', [2, 5], 'name'), $tk('？')];
@endphp
<div class="stack">
  <x-ruby-line :tokens="$demo" audio="你好！你叫什么名字？"/>
  <x-ruby-line :tokens="[$tk('妈', 'mā', [1]), $tk('麻', 'má', [2]), $tk('马', 'mǎ', [3]), $tk('骂', 'mà', [4]), $tk('吗', 'ma', [5]), $tk('。')]"/>
  <x-dialogue-bubble speaker="A" zh="你好！你叫什么名字？" :tokens="$demo" en="Hello! What is your name?"/>
</div>

<h2>action-row</h2>
<div class="stack">
  <x-action-row icon="✍️" title="Practice writing" sub="12 characters" variant="dark"/>
  <x-action-row icon="🔁" title="Review flashcards" sub="8 due"/>
</div>

<h2>lesson-card</h2>
<div class="grid">
  <x-lesson-card n="Lesson 1" title="Greetings" sub="24 words" :progress="100"/>
  <x-lesson-card n="Lesson 2" title="Family" sub="30 words" :progress="40" state="current"/>
  <x-lesson-card n="Lesson 3" title="Food" sub="28 words" :progress="0" state="locked"/>
</div>

<h2>writing-grid</h2>
<div class="row">
  <x-writing-grid char="学" mode="watch" grid="cross" :stroke="3" :max="8"/>
  <x-writing-grid char="学" mode="write" grid="mi" :stroke="0" :max="8"/>
  <x-writing-grid char="学" mode="blank" grid="none"/>
</div>
</div>
@endsection
