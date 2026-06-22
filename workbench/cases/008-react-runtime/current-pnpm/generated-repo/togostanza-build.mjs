import typescript from '@rollup/plugin-typescript';

export default function config() {
  return {
    rollup: {
      plugins: [
        typescript({
          include: ['stanzas/**/*.ts', 'stanzas/**/*.tsx'],
          jsx: 'react',
          module: 'esnext',
          noEmit: false,
          target: 'es2020',
        }),
      ],
    },
  };
}
