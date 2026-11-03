# -*- coding: utf-8 -*-
"""Генерация иконок для раздела «Ссылки» (SVG, брендовые цвета)."""
import os

OUT = r"G:\LMStudio\otp-team\assets\img\links"
os.makedirs(OUT, exist_ok=True)

ICONS = {
    "jira":       ("#2684FF", "#0B4FC4", "J"),
    "confluence": ("#2684FF", "#0052CC", "C"),
    "support":    ("#22C55E", "#0F7C3C", "S"),
    "password":   ("#F59E0B", "#B45309", "K"),
    "portal":     ("#6366F1", "#312E81", "P"),
    "corp":       ("#EF4444", "#7F1D1D", "C"),
    "openvpn":    ("#10B981", "#065F46", "V"),
    "librechat":  ("#14B8A6", "#0F766E", "L"),
    "grafana":    ("#F97316", "#B45309", "G"),
    "graylog":    ("#64748B", "#1E293B", "G"),
    "joint":      ("#8B5CF6", "#4C1D95", "J"),
    "postfix":    ("#0EA5E9", "#075985", "M"),
    "mail":       ("#38BDF8", "#0369A1", "M"),
    "zabbix":     ("#DC2626", "#7F1D1D", "Z"),
    "vahta":      ("#EAB308", "#854D0E", "V"),
    "yandex":     ("#FC3F1D", "#9A2A14", "Я"),
    "calendar":   ("#3B82F6", "#1D4ED8", "31"),
    "disk":       ("#FACC15", "#A16207", "D"),
    "n8n":        ("#EA4B71", "#831843", "n8n"),
    "datalens":   ("#2563EB", "#1E3A8A", "D"),
}

TPL = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" '
    'role="img" aria-label="{label}">'
    '<defs>'
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    '<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>'
    '</linearGradient>'
    '<filter id="s" x="-20%" y="-20%" width="140%" height="140%">'
    '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".35"/>'
    '</filter>'
    '</defs>'
    '<rect x="2" y="2" width="60" height="60" rx="15" fill="url(#g)" filter="url(#s)"/>'
    '<rect x="2.5" y="2.5" width="59" height="59" rx="14.5" fill="none" '
    'stroke="rgba(255,255,255,.22)"/>'
    '<text x="32" y="{ty}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" '
    'font-size="{fs}" font-weight="700" fill="#fff" letter-spacing="-0.5">{letter}</text>'
    '</svg>'
)

for key, (c1, c2, letter) in ICONS.items():
    fs = 28 if len(letter) == 1 else 20
    ty = 42 if len(letter) == 1 else 40
    svg = TPL.format(c1=c1, c2=c2, letter=letter, fs=fs, ty=ty, label=key)
    open(os.path.join(OUT, key + ".svg"), "w", encoding="utf-8").write(svg)
    print("+", key + ".svg")
print("готово:", len(ICONS))
