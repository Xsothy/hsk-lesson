@extends('layouts.app')
@section('title', 'Account')
@push('head')<link rel="stylesheet" href="/css/auth.css">@endpush
@section('content')
<section class="au-card" aria-labelledby="au-t">
  <h1 id="au-t">Account</h1>
  <dl class="au-dl">
    <dt>Signed in as</dt>
    <dd id="au-user-email">{{ $user->email }}</dd>
    <dt>Sync</dt>
    <dd>Sync coming soon <span class="chip chip-gold">beta</span><br><span class="au-note">For now, progress stays in this browser.</span></dd>
  </dl>
  <form method="POST" action="{{ route('logout') }}">
    @csrf
    <button type="submit" class="au-btn">Sign out</button>
  </form>
</section>

<section class="au-card au-danger-zone" aria-labelledby="au-del">
  <h2 id="au-del">Delete account</h2>
  <p class="au-note">Deletes your account and signs you out everywhere. Progress saved in this browser is not touched.</p>
  @error('confirm_email')<p class="au-err" role="alert">{{ $message }}</p>@enderror
  <button type="button" class="au-btn au-danger" id="au-del-open">Delete account…</button>
</section>

<dialog id="au-del-dlg" aria-labelledby="au-del-t">
  <form method="POST" action="{{ route('account.destroy') }}" class="au-form">
    @csrf
    @method('DELETE')
    <h2 id="au-del-t">Delete your account?</h2>
    <p>This can't be undone. Type <strong>{{ $user->email }}</strong> to confirm.</p>
    <label for="au-confirm-email" class="au-sr">Your email</label>
    <input id="au-confirm-email" name="confirm_email" type="email" autocomplete="off" required>
    <div class="au-row">
      <button type="button" class="au-btn" id="au-del-cancel">Cancel</button>
      <button type="submit" class="au-btn au-danger">Delete account</button>
    </div>
  </form>
</dialog>
@endsection
@push('scripts')
<script>
(function () {
  var dlg = document.getElementById('au-del-dlg');
  document.getElementById('au-del-open').addEventListener('click', function () { dlg.showModal(); });
  document.getElementById('au-del-cancel').addEventListener('click', function () { dlg.close(); });
})();
</script>
@endpush
