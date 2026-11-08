@extends('layouts.app')
@section('title', 'Account')
@push('head')<link rel="stylesheet" href="/css/auth.css">@endpush
@section('content')
<section class="au-card" aria-labelledby="au-t">
  <h1 id="au-t">Account</h1>
  @if (session('status'))<p class="au-ok" role="status">{{ session('status') }}</p>@endif
  <dl class="au-dl">
    <dt>Name</dt>
    <dd id="au-user-name">{{ $user->name }}</dd>
    <dt>Email</dt>
    <dd id="au-user-email">{{ $user->email }}</dd>
    <dt>Sync</dt>
    <dd>Sync on <span class="chip chip-gold">beta</span><br><span class="au-note">Progress, saved words, reviews and settings sync to every device you sign in on. Signing out keeps this browser’s copy.</span></dd>
  </dl>
  <form method="POST" action="{{ route('logout') }}">
    @csrf
    <button type="submit" class="au-btn">Sign out</button>
  </form>
</section>

<section class="au-card" aria-labelledby="au-pw">
  <h2 id="au-pw">Change password</h2>
  <form method="POST" action="{{ route('account.password') }}" class="au-form" novalidate>
    @csrf
    @method('PUT')
    <label for="au-current">Current password</label>
    <input id="au-current" name="current_password" type="password" autocomplete="current-password" required>
    @error('current_password', 'password')<p class="au-err" role="alert">{{ $message }}</p>@enderror
    <label for="au-new">New password</label>
    <input id="au-new" name="password" type="password" autocomplete="new-password" required minlength="8">
    @error('password', 'password')<p class="au-err" role="alert">{{ $message }}</p>@enderror
    <label for="au-new2">Confirm new password</label>
    <input id="au-new2" name="password_confirmation" type="password" autocomplete="new-password" required>
    <button type="submit" class="au-btn">Change password</button>
  </form>
</section>

<section class="au-card" aria-labelledby="au-del">
  <h2 id="au-del">Delete account</h2>
  <p class="au-note">Deletes your account and signs you out everywhere. Progress saved in this browser is not touched.</p>
  @error('password', 'delete')<p class="au-err" role="alert">{{ $message }}</p>@enderror
  <button type="button" class="au-btn au-danger" id="au-del-open">Delete account…</button>
</section>

<dialog id="au-del-dlg" aria-labelledby="au-del-t">
  <form method="POST" action="{{ route('account.destroy') }}" class="au-form">
    @csrf
    @method('DELETE')
    <h2 id="au-del-t">Delete your account?</h2>
    <p>This can't be undone. Enter your password to confirm.</p>
    <label for="au-del-pw">Password</label>
    <input id="au-del-pw" name="password" type="password" autocomplete="current-password" required>
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
