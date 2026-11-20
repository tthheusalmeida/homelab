import { useState } from 'react';

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CategoryNode } from '../types/library.types';

import { CategoryTree } from './CategoryTree';

const docker: CategoryNode = {
  name: 'Docker',
  path: ['Tecnologia', 'Docker'],
  count: 1,
  children: [],
};
const tree: CategoryNode[] = [
  { name: 'Tecnologia', path: ['Tecnologia'], count: 2, children: [docker] },
  { name: 'Culinária', path: ['Culinária'], count: 1, children: [] },
];

const folder = (name: RegExp | string) => screen.getByRole('button', { name });
const docker$ = () => screen.queryByRole('button', { name: /^Docker/ });
const tecnologia = () => folder(/^Tecnologia\s*2$/);

/** A tela de verdade: quem escolhe a categoria é o estado de fora da árvore. */
function Controlled({ start = [] as string[] }: { start?: string[] }) {
  const [selected, setSelected] = useState(start);

  return <CategoryTree nodes={tree} selected={selected} onSelect={setSelected} />;
}

describe('CategoryTree: abrir e fechar clicando na pasta', () => {
  it('when the selected folder is open, should close it with a click', async () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    expect(docker$()).toBeInTheDocument();

    await userEvent.click(tecnologia());

    expect(docker$()).not.toBeInTheDocument();
    expect(tecnologia()).toHaveAttribute('aria-expanded', 'false');
  });

  it('when a folder above the selected one is open, should close it with a click', async () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia', 'Docker']} onSelect={() => {}} />);

    await userEvent.click(tecnologia());

    expect(docker$()).not.toBeInTheDocument();
  });

  it('when a closed folder is clicked, should choose it and open it', async () => {
    const onSelect = vi.fn();

    render(<CategoryTree nodes={tree} selected={[]} onSelect={onSelect} />);

    expect(tecnologia()).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(tecnologia());

    expect(onSelect).toHaveBeenCalledWith(['Tecnologia']);
    expect(tecnologia()).toHaveAttribute('aria-expanded', 'true');
    expect(docker$()).toBeInTheDocument();
  });

  it('when an open folder that is not the chosen one is clicked, should choose it and close it', async () => {
    const onSelect = vi.fn();

    render(<CategoryTree nodes={tree} selected={['Culinária']} onSelect={onSelect} />);

    await userEvent.click(tecnologia());
    await userEvent.click(tecnologia());

    expect(tecnologia()).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('when it is closed and clicked again, should open it again', async () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    await userEvent.click(tecnologia());
    await userEvent.click(tecnologia());

    expect(docker$()).toBeInTheDocument();
  });

  it('when the choice comes from the click itself, should not reopen the folder the click closed', async () => {
    render(<Controlled start={['Tecnologia']} />);

    expect(docker$()).toBeInTheDocument();

    // a pasta já escolhida e aberta: o clique fecha e a escolha continua nela
    await userEvent.click(tecnologia());

    expect(docker$()).not.toBeInTheDocument();
  });

  it('when another folder is open and a different one is clicked, should open the new one and keep the first', async () => {
    render(<Controlled />);

    await userEvent.click(tecnologia());
    await userEvent.click(folder(/^Culinária/));

    expect(docker$()).toBeInTheDocument();
  });

  it('when the choice changes from outside, should open the folder and the ones above it', () => {
    const { rerender } = render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(docker$()).not.toBeInTheDocument();

    rerender(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    expect(docker$()).toBeInTheDocument();
  });

  it('when a folder without anything inside is clicked, should only choose it', async () => {
    const onSelect = vi.fn();

    render(<CategoryTree nodes={tree} selected={[]} onSelect={onSelect} />);

    await userEvent.click(folder(/^Culinária/));

    expect(onSelect).toHaveBeenCalledWith(['Culinária']);
    expect(folder(/^Culinária/)).not.toHaveAttribute('aria-expanded');
  });
});

describe('CategoryTree: a pasta é uma coisa só', () => {
  it('when drawing a folder, should have one button for it (icon and name together), not one for each', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    const row = folder(/^Tecnologia/).parentElement as HTMLElement;

    expect(row.querySelectorAll('button')).toHaveLength(1);
    expect(folder(/^Tecnologia/).querySelector('svg')).not.toBeNull();
  });

  it('when the mouse is over the folder, should light the whole row, not just the name', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    const row = folder(/^Tecnologia/).parentElement as HTMLElement;

    expect(row).toHaveClass('hover:bg-primary/10');
    expect(row).not.toHaveClass('hover:bg-muted');
  });

  it('when the folder is chosen, should keep the chosen highlight on the row without the plain hover', () => {
    render(<CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} />);

    const row = folder(/^Culinária/).parentElement as HTMLElement;

    expect(row).toHaveClass('bg-primary/15', 'hover:bg-primary/20');
    expect(row).not.toHaveClass('hover:bg-primary/10');
  });

  it('when the folder has actions, should be the only other buttons of the row (edit and create)', () => {
    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        onEdit={() => {}}
        onCreate={() => {}}
      />,
    );

    const row = folder(/^Culinária/).parentElement as HTMLElement;
    const names = Array.from(row.querySelectorAll('button')).map(
      (button) => button.getAttribute('aria-label') ?? button.textContent,
    );

    expect(names).toEqual([
      expect.stringMatching(/^Culinária/),
      'Nova categoria dentro de Culinária',
      'Editar a categoria Culinária',
    ]);
  });
});

describe('CategoryTree: a linha é o item, a área clicável não tem visual próprio', () => {
  const classesOf = (element: HTMLElement) => element.className.split(/\s+/);

  it('when drawing a folder, should not style the clickable area (background, hover or open state): the row does', () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    const classes = classesOf(folder(/^Tecnologia/));

    expect(classes.filter((name) => /(^|:)bg-|aria-expanded:|hover:|data-open/.test(name))).toEqual(
      [],
    );
  });

  it('when the folder is open, should not change how it looks apart from the hexagon', () => {
    const { rerender } = render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);
    const closed = folder(/^Tecnologia/).className;

    rerender(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    // a escolhida muda a linha (fundo), não a área clicável
    expect(folder(/^Tecnologia/).className).toBe(closed);
  });

  it('when the mouse is over any part of the row, should light it in the accent color (a lighter variant)', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    const row = folder(/^Culinária/).parentElement as HTMLElement;

    expect(row).toHaveClass('hover:bg-primary/10');
  });

  it('when the count is shown, should be inside the same row that lights up (icon, name and count together)', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    const row = folder(/^Tecnologia/).parentElement as HTMLElement;

    expect(row).toContainElement(
      folder(/^Tecnologia/).querySelector('svg') as unknown as HTMLElement,
    );
    expect(row).toContainElement(row.querySelector('.font-mono') as HTMLElement);
  });

  it('when drawing "Todas as categorias", should follow the same rule as the folders', () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    const button = folder('Todas as categorias');

    expect(button.parentElement).toHaveClass('hover:bg-primary/10');
    expect(classesOf(button).filter((name) => /bg-|hover:/.test(name))).toEqual([]);
  });

  it('when the keyboard focuses a folder, should show a focus ring on it', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(folder(/^Culinária/)).toHaveClass('focus-visible:ring-2');
  });
});
