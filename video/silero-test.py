import torch, silero, time
torch.set_num_threads(4)
t0 = time.time()
model, _ = torch.hub.load(repo_or_dir="snakers4/silero-models", model="silero_tts", language="ru", speaker="v5_ru", trust_repo=True)
print("model loaded in", round(time.time()-t0,1), "s")
text = "Привет! Это «Мои результаты» — личный кабинет сотрудника отдела технической поддержки."
for spk in ["aidar", "eugene", "baya"]:
    t = time.time()
    audio = model.apply_tts(text=text, speaker=spk, sample_rate=48000)
    torch.save(audio, f"video/out/silero-{spk}.pt")
    print(spk, "ok", round(time.time()-t,1), "s, samples:", audio.shape[-1])
