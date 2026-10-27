"""Rebuild the three CPU pilot figures with Python and Matplotlib."""
import csv
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
with (HERE / 'epochs.csv').open() as stream:
    epochs = list(csv.DictReader(stream))
with (HERE / 'metrics.csv').open() as stream:
    metrics = list(csv.DictReader(stream))
summary = json.loads((HERE / 'pilot-summary.json').read_text())

fig, axes = plt.subplots(2, 1, figsize=(8, 6), sharex=True)
for ax, field, label in zip(axes, ['policy_loss', 'value_loss'], ['Policy loss', 'Value loss']):
    for iteration in range(1, 7):
        rows = [row for row in epochs if int(row['iteration']) == iteration]
        ax.plot([int(row['epoch']) for row in rows],
                [float(row[field]) for row in rows],
                marker='o', label=f'Iteration {iteration}')
    ax.set(ylabel=label, xticks=[1, 2, 3])
axes[0].set_title('Candidate training losses')
axes[1].set_xlabel('Epoch')
handles, labels = axes[0].get_legend_handles_labels()
fig.legend(handles, labels, loc='lower center', ncol=3, fontsize=9)
fig.tight_layout(rect=(0, .08, 1, 1))
fig.savefig(HERE / 'training-loss.png', dpi=180)
plt.close(fig)

keys = ['initial_vs_random', 'trained_vs_random', 'trained_vs_initial']
labels = ['Before training\nvs random', 'After training\nvs random',
          'After vs before\ntraining']
results = [summary['holdout'][key] for key in keys]
wins = [result['wins'] for result in results]
losses = [result['losses'] for result in results]
assert all(result['games'] == 100 and result['draws'] == 0 for result in results)
fig, ax = plt.subplots(figsize=(8, 4.5))
win_bars = ax.barh(range(3), wins, height=.55, label='Wins')
loss_bars = ax.barh(range(3), losses, left=wins, height=.55, label='Losses')
ax.bar_label(win_bars, labels=[f'{n} wins' for n in wins], label_type='center', color='white')
ax.bar_label(loss_bars, labels=[f'{n} losses' for n in losses], label_type='center')
ax.set(yticks=range(3), yticklabels=labels, xlim=(0, 100),
       xlabel='Games (out of 100)', title='Evaluation: wins and losses')
ax.invert_yaxis()
ax.legend(loc='upper center', bbox_to_anchor=(.5, -.18), ncol=2)
fig.tight_layout()
fig.savefig(HERE / 'evaluation.png', dpi=180)
plt.close(fig)

iterations = [int(row['iteration']) for row in metrics]
fig, ax = plt.subplots(figsize=(8, 4.5))
bottom = [0.] * len(metrics)
for field, label in [('self_play_seconds', 'Self-play'),
                     ('training_seconds', 'Training'),
                     ('arena_seconds', 'Evaluation')]:
    values = [float(row[field]) for row in metrics]
    ax.bar(iterations, values, bottom=bottom, label=label)
    bottom = [total + value for total, value in zip(bottom, values)]
ax.set(xlabel='Iteration', ylabel='Time (seconds)', xticks=iterations,
       title='Time spent per iteration')
ax.legend(fontsize=9)
fig.tight_layout()
fig.savefig(HERE / 'training-time.png', dpi=180)
plt.close(fig)
