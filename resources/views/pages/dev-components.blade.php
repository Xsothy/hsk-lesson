@extends('layouts.app')
@section('title', 'Components')
@section('content')
{{-- Each .dev-board mirrors a board on the design canvas "5 · Component library" page (same sample content, board width). --}}
<div class="dev">
<h1>Components</h1>

<h2>chip</h2>
<div class="dev-board row" id="b-chip">
  <x-chip :button="true" :active="true">HSK 2.0</x-chip><x-chip :button="true">HSK 3.0</x-chip>
</div>
<div class="row" style="margin-top:12px">
  <x-chip tone="red">Red</x-chip><x-chip tone="green">Green</x-chip><x-chip tone="gold">Gold</x-chip><x-chip tone="blue">Blue</x-chip><x-chip href="#">Link</x-chip>
</div>

<h2>stat-card</h2>
<div class="dev-board stack" id="b-stat" style="--bw:200px">
  <x-stat-card value="138" label="words known"/><x-stat-card value="12" label="cards due" tone="red"/>
  <x-stat-card value="7" label="day streak" tone="gold"/><x-stat-card value="5/10" label="characters today" tone="green" :soft="true"/>
</div>

<h2>char-tile</h2>
<div class="dev-board row" id="b-tile" style="--bw:120px">
  <x-char-tile c="学" p="xué" m="to study" :tone="2"/>
  <x-char-tile c="你" p="nǐ" m="you" :tone="3" dot="learning"/>
  <x-char-tile c="妈" p="mā" m="mom" :tone="1" dot="new" variant="soft"/>
  <x-char-tile c="是" p="shì" m="to be" :tone="4" dot="known"/>
  <x-char-tile c="好" p="hǎo" m="good" :tone="3" :large="true" href="{{ route('char', '好') }}"/>
</div>

<h2>word-row</h2>
<div class="dev-board stack" id="b-word" style="--bw:560px">
  <x-word-row :word="['hanzi'=>'学生','pinyin'=>'xuésheng','english'=>'student']" tag="HSK 1" :audio="false"/>
  <x-word-row :word="['hanzi'=>'学习','pinyin'=>'xuéxí','english'=>'to study','meta'=>'verb']" tag="HSK 1" href="{{ route('char', '学') }}"/>
  <x-word-row :word="['hanzi'=>'老师','pinyin'=>'lǎoshī','english'=>'teacher']"/>
</div>

<h2>quiz-option</h2>
<div class="dev-board stack" id="b-quiz" style="--bw:360px">
  <x-quiz-option label="医院"/><x-quiz-option label="医院" state="selected"/>
  <x-quiz-option label="医院" state="correct"/><x-quiz-option label="医院" state="wrong"/>
</div>
<div class="stack" style="margin-top:12px;max-width:360px"><x-quiz-option label="医院" state="disabled"/></div>

<h2>dialogue-bubble</h2>
<div class="dev-board stack" id="b-bubble" style="--bw:480px">
  <x-dialogue-bubble speaker="A" zh="你在哪儿工作？" en="Where do you work?"/>
  <x-dialogue-bubble speaker="B" side="right" zh="我在医院工作。" en="I work at a hospital."/>
</div>
<div class="stack" style="margin-top:12px;max-width:480px"><x-dialogue-bubble speaker="A" zh="你好，你叫什么名字？" pinyin="Nǐ hǎo, nǐ jiào shénme míngzi?" en="Hello, what is your name?"/></div>

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
<div class="dev-board stack" id="b-action" style="--bw:360px">
  <x-action-row glyph="写" title="Write the characters" sub="19 characters · stroke feedback" variant="dark" href="#"/>
  <x-action-row glyph="写" title="Write the characters" sub="19 characters · stroke feedback" variant="light" href="#"/>
  <x-action-row glyph="写" title="Write the characters" sub="19 characters · stroke feedback" variant="red" cta="Start" href="#"/>
  <x-action-row glyph="写" title="Write the characters" sub="19 characters · stroke feedback" variant="gold" href="#"/>
</div>
<div class="stack" style="margin-top:12px;max-width:360px">
  <x-action-row icon="repeat" title="Review flashcards" sub="8 due" href="#"/>
</div>

<h2>lesson-card</h2>
<div class="dev-board stack" id="b-lesson" style="--bw:300px">
  <x-lesson-card :n="5" title="School & Work" zh="学校与工作" :progress="60"/>
  <x-lesson-card :n="1" title="Greetings" zh="你好" :progress="100"/>
  <x-lesson-card :n="2" title="Family" zh="家人" :progress="0"/>
</div>
<div class="stack" style="margin-top:12px;max-width:300px"><x-lesson-card :n="3" title="Food" sub="吃饭" :progress="40" state="current"/></div>

<h2>writing-grid</h2>
<div class="dev-board row" id="b-grid" style="--bw:360px">
  <x-writing-grid char="学" mode="watch" grid="mi" :stroke="3" :max="8"/>
  <x-writing-grid char="学" mode="outline" grid="tian"/>
  <x-writing-grid char="学" mode="blank" grid="mi"/>
</div>
</div>
@endsection
