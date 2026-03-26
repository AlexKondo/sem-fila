const URL = 'https://ltvgkeracfdyolkgkkji.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0dmdrZXJhY2ZkeW9sa2dra2ppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIxMTY2OSwiZXhwIjoyMDg5Nzg3NjY5fQ.BHw8nnO58nnFLY6wL04xJCTRnc2lRLJLcOp6kHSRhho';

const h = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

async function post(path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { method: 'POST', headers: h, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`POST ${path}: ${await r.text()}`);
  return r.json();
}

// ── CARDÁPIOS ────────────────────────────────────────────────────────────────

const MENUS = [
  {
    vendorNum: 1,
    name: 'Burguer Haus',
    description: 'Os melhores smash burgers da cidade, feitos na hora.',
    business_type: 'hamburguer',
    avg_prep_time: 15,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Classic Smash', description: 'Duplo smash, queijo americano, picles, molho especial', price: 32.90 },
      { category: 'Prato Principal', name: 'BBQ Bacon Burger', description: 'Smash, bacon crocante, cheddar, onion rings, molho BBQ', price: 39.90 },
      { category: 'Prato Principal', name: 'Mushroom Swiss', description: 'Cogumelos salteados, queijo suíço, rúcula, aioli', price: 37.90 },
      { category: 'Prato Principal', name: 'Spicy Jalapeño', description: 'Pimenta jalapeño, queijo pepper jack, molho sriracha', price: 36.90 },
      { category: 'Prato Principal', name: 'Veggie Smash', description: 'Blend de grão-de-bico, queijo brie, tomate, alface', price: 33.90 },
      // Acompanhamentos
      { category: 'Acompanhamentos', name: 'Batata Frita Clássica', description: 'Frita sequinha com sal e alecrim', price: 14.90 },
      { category: 'Acompanhamentos', name: 'Onion Rings', description: 'Anéis de cebola empanados com panko', price: 16.90 },
      { category: 'Acompanhamentos', name: 'Fritas Trufadas', description: 'Batata frita com azeite de trufas e parmesão', price: 22.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Milkshake Baunilha', description: 'Cremoso, feito com sorvete artesanal', price: 18.90 },
      { category: 'Bebidas', name: 'Milkshake Chocolate', description: 'Chocolate belga, chantilly', price: 19.90 },
      { category: 'Bebidas', name: 'Refrigerante Lata', description: 'Coca, Sprite ou Guaraná', price: 7.90 },
      { category: 'Bebidas', name: 'Água Mineral', description: 'Com ou sem gás 500ml', price: 5.00 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Brownie com Sorvete', description: 'Brownie quente, sorvete de creme, calda de caramelo', price: 16.90 },
      { category: 'Sobremesas', name: 'Cookie Recheado', description: 'Cookie gigante de chocolate com recheio de nutella', price: 12.90 },
    ]
  },
  {
    vendorNum: 2,
    name: 'Sakura Japanese',
    description: 'Autêntica culinária japonesa: sushi, temaki e muito mais.',
    business_type: 'japones',
    avg_prep_time: 20,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Combinado Sushi 16 peças', description: 'Salmão, atum, camarão e peixe branco', price: 54.90 },
      { category: 'Prato Principal', name: 'Temaki Salmão', description: 'Cone de alga com arroz, salmão e cream cheese', price: 28.90 },
      { category: 'Prato Principal', name: 'Temaki Philadelphia', description: 'Salmão, cream cheese, pepino e cebolinha', price: 29.90 },
      { category: 'Prato Principal', name: 'Uramaki Hot Filadélfia', description: '8 peças com salmão grelhado e cream cheese', price: 32.90 },
      { category: 'Prato Principal', name: 'Ramen Tonkotsu', description: 'Caldo de porco, macarrão, ovo marinado e nori', price: 42.90 },
      { category: 'Prato Principal', name: 'Yakisoba de Frango', description: 'Macarrão oriental refogado com legumes e frango', price: 36.90 },
      // Entradas
      { category: 'Entradas', name: 'Edamame', description: 'Vagem de soja cozida com sal grosso', price: 14.90 },
      { category: 'Entradas', name: 'Gyoza (6 un)', description: 'Pastel japonês de porco e repolho, grelhado', price: 22.90 },
      { category: 'Entradas', name: 'Karaage', description: 'Frango frito japonês com maionese de wasabi', price: 24.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Chá Verde Gelado', description: 'Matcha gelado com leite', price: 12.90 },
      { category: 'Bebidas', name: 'Saquê Tradicional', description: '200ml, servido frio', price: 18.90 },
      { category: 'Bebidas', name: 'Ramune Soda', description: 'Refrigerante japonês original', price: 9.90 },
      { category: 'Bebidas', name: 'Água Mineral', description: '500ml', price: 5.00 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Mochi de Morango', description: 'Bolinho de arroz glutinoso com recheio de morango', price: 14.90 },
      { category: 'Sobremesas', name: 'Tempura de Banana', description: 'Banana empanada frita com sorvete de matcha', price: 16.90 },
    ]
  },
  {
    vendorNum: 3,
    name: 'Bangkok Street',
    description: 'Sabores autênticos da Tailândia direto pra você.',
    business_type: 'tailandes',
    avg_prep_time: 18,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Pad Thai Camarão', description: 'Macarrão de arroz, camarão, amendoim, broto de feijão', price: 44.90 },
      { category: 'Prato Principal', name: 'Pad Thai Frango', description: 'Clássico pad thai com frango, ovo e tamarindo', price: 38.90 },
      { category: 'Prato Principal', name: 'Curry Verde', description: 'Leite de coco, legumes, frango e curry verde', price: 42.90 },
      { category: 'Prato Principal', name: 'Curry Vermelho', description: 'Pimentão, berinjela, leite de coco, camarão', price: 46.90 },
      { category: 'Prato Principal', name: 'Mango Sticky Rice', description: 'Arroz glutinoso, manga fresca e leite de coco', price: 22.90 },
      { category: 'Prato Principal', name: 'Tom Yum Soup', description: 'Sopa picante com camarão, capim-limão e cogumelo', price: 34.90 },
      // Entradas
      { category: 'Entradas', name: 'Spring Rolls (4 un)', description: 'Rolinho primavera tailandês com molho agridoce', price: 18.90 },
      { category: 'Entradas', name: 'Satay de Frango', description: 'Espetinho grelhado com molho de amendoim', price: 24.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Thai Iced Tea', description: 'Chá tailandês com leite condensado e gelo', price: 13.90 },
      { category: 'Bebidas', name: 'Água de Coco', description: 'Natural gelada 300ml', price: 9.90 },
      { category: 'Bebidas', name: 'Limonada com Capim-Limão', description: 'Refrescante e levemente adocicada', price: 12.90 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Banana Frita com Mel', description: 'Banana empanada, mel de cana e gergelim', price: 14.90 },
      { category: 'Sobremesas', name: 'Pudim de Coco', description: 'Cremoso, com calda de tamarindo', price: 13.90 },
    ]
  },
  {
    vendorNum: 4,
    name: 'Al Medina',
    description: 'Culinária árabe tradicional: esfihas, kebabs e shawarmas.',
    business_type: 'arabe',
    avg_prep_time: 15,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Shawarma de Frango', description: 'Pão árabe, frango temperado, homus, tahine e salada', price: 32.90 },
      { category: 'Prato Principal', name: 'Shawarma de Carne', description: 'Carne bovina marinada, tabule, pepino e iogurte', price: 36.90 },
      { category: 'Prato Principal', name: 'Kebab Misto', description: 'Espeto de cordeiro e frango, arroz árabe e fatoush', price: 48.90 },
      { category: 'Prato Principal', name: 'Falafel Wrap', description: 'Falafel crocante, tahine, tomate e alface', price: 28.90 },
      { category: 'Prato Principal', name: 'Kibe Assado', description: 'Kibe com recheio de carne moída e hortelã', price: 14.90 },
      // Entradas
      { category: 'Entradas', name: 'Homus com Pão Árabe', description: 'Pasta de grão-de-bico com azeite e páprica', price: 18.90 },
      { category: 'Entradas', name: 'Esfiha Aberta (3 un)', description: 'Massa leve com recheio de carne ou espinafre', price: 19.90 },
      { category: 'Entradas', name: 'Tabule', description: 'Salada de trigo, salsinha, limão e tomate', price: 16.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Suco de Romã', description: 'Natural, gelado', price: 12.90 },
      { category: 'Bebidas', name: 'Laban', description: 'Iogurte líquido árabe levemente salgado', price: 9.90 },
      { category: 'Bebidas', name: 'Água de Rosa', description: 'Tradicional, servida gelada', price: 8.90 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Baklava', description: 'Massa folhada com pistache e mel de flor de laranjeira', price: 13.90 },
      { category: 'Sobremesas', name: 'Kanafeh', description: 'Doce quente de queijo com calda de mel e pistache', price: 16.90 },
    ]
  },
  {
    vendorNum: 5,
    name: 'La Piazza',
    description: 'Pizzas napolitanas e massas frescas feitas com amor.',
    business_type: 'italiano',
    avg_prep_time: 20,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Pizza Margherita', description: 'Molho de tomate San Marzano, fior di latte, manjericão', price: 44.90 },
      { category: 'Prato Principal', name: 'Pizza Pepperoni', description: 'Pepperoni artesanal, queijo mozzarella, orégano', price: 48.90 },
      { category: 'Prato Principal', name: 'Pizza Quatro Queijos', description: 'Mozzarella, gorgonzola, parmesão e brie', price: 52.90 },
      { category: 'Prato Principal', name: 'Tagliatelle al Ragù', description: 'Massa fresca, ragù de carne bovina, parmesão', price: 42.90 },
      { category: 'Prato Principal', name: 'Risoto de Funghi', description: 'Arroz arbóreo, funghi porcini, vinho branco', price: 46.90 },
      // Entradas
      { category: 'Entradas', name: 'Bruschetta', description: 'Pão ciabatta, tomate concassé, manjericão e azeite', price: 18.90 },
      { category: 'Entradas', name: 'Carpaccio', description: 'Carne bovina, alcaparras, rúcula e parmesão', price: 28.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Vinho Tinto (taça)', description: 'Seleção do sommelier', price: 19.90 },
      { category: 'Bebidas', name: 'Água com Gás San Pellegrino', description: '500ml', price: 9.90 },
      { category: 'Bebidas', name: 'Espresso', description: 'Café italiano encorpado', price: 7.90 },
      { category: 'Bebidas', name: 'Limonata Italiana', description: 'Limão siciliano, água com gás, hortelã', price: 12.90 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Tiramisù', description: 'Clássico italiano com mascarpone, café e cacau', price: 18.90 },
      { category: 'Sobremesas', name: 'Panna Cotta', description: 'Com calda de frutas vermelhas', price: 15.90 },
    ]
  },
  {
    vendorNum: 6,
    name: 'Taco Loco',
    description: 'Sabores do México com muito guacamole e pimenta!',
    business_type: 'mexicano',
    avg_prep_time: 12,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Tacos al Pastor (3 un)', description: 'Carne de porco marinada, abacaxi, coentro e cebola', price: 34.90 },
      { category: 'Prato Principal', name: 'Burrito de Carne', description: 'Wrap com carne bovina, arroz, feijão, queijo e pico de gallo', price: 36.90 },
      { category: 'Prato Principal', name: 'Quesadilla de Frango', description: 'Tortilha, frango, queijo fundido e jalapeño', price: 29.90 },
      { category: 'Prato Principal', name: 'Enchiladas Verdes', description: 'Tortilha recheada de frango, molho verde e creme', price: 38.90 },
      { category: 'Prato Principal', name: 'Bowl de Carnitas', description: 'Porco desfiado, arroz, feijão preto, guacamole', price: 39.90 },
      // Entradas
      { category: 'Entradas', name: 'Nachos Supreme', description: 'Chips, queijo, jalapeño, feijão e pico de gallo', price: 24.90 },
      { category: 'Entradas', name: 'Guacamole Fresco', description: 'Abacate, limão, coentro, pimenta — com chips', price: 19.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Margarita', description: 'Limão, triple sec, sal na borda — sem álcool disponível', price: 18.90 },
      { category: 'Bebidas', name: 'Agua Fresca de Hibisco', description: 'Tradicional jamaica gelada', price: 10.90 },
      { category: 'Bebidas', name: 'Horchata', description: 'Bebida de arroz com canela', price: 9.90 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Churros', description: 'Frito, crocante, com doce de leite e chocolate', price: 14.90 },
      { category: 'Sobremesas', name: 'Tres Leches', description: 'Bolo embebido em três leites, chantilly e canela', price: 16.90 },
    ]
  },
  {
    vendorNum: 7,
    name: 'Brasa & Fogo',
    description: 'Churrasco gaúcho premium nas brasas de lenha.',
    business_type: 'churrasco',
    avg_prep_time: 25,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Picanha na Brasa', description: '300g, mal passada a bem passada, vinagrete incluso', price: 68.90 },
      { category: 'Prato Principal', name: 'Costela Prime', description: '400g cozida lentamente na brasa, molho de alho', price: 74.90 },
      { category: 'Prato Principal', name: 'Fraldinha Grelhada', description: 'Corte especial, temperado com ervas finas, 300g', price: 58.90 },
      { category: 'Prato Principal', name: 'Linguiça Artesanal', description: '250g de linguiça toscana, pão de alho e vinagrete', price: 34.90 },
      { category: 'Prato Principal', name: 'Frango no Espeto', description: 'Frango inteiro desossado, marinado no limão e ervas', price: 42.90 },
      // Acompanhamentos
      { category: 'Acompanhamentos', name: 'Farofa da Casa', description: 'Farofa crocante com bacon, ovo e salsinha', price: 14.90 },
      { category: 'Acompanhamentos', name: 'Pão de Alho', description: '4 fatias com manteiga de ervas', price: 12.90 },
      { category: 'Acompanhamentos', name: 'Salada de Maionese', description: 'Batata, cenoura, ervilha e maionese', price: 13.90 },
      { category: 'Acompanhamentos', name: 'Arroz Carreteiro', description: 'Arroz com carne seca, alho e cheiro-verde', price: 18.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Chopp Artesanal', description: 'IPA ou Pilsen, 400ml', price: 14.90 },
      { category: 'Bebidas', name: 'Caipirinha de Limão', description: 'Cachaça premium, limão, açúcar', price: 16.90 },
      { category: 'Bebidas', name: 'Refrigerante Lata', description: 'Coca, Guaraná ou Sprite', price: 7.90 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Pudim de Leite', description: 'Caseiro, calda de caramelo', price: 12.90 },
      { category: 'Sobremesas', name: 'Abacaxi Grelhado', description: 'Com canela e sorvete de creme', price: 14.90 },
    ]
  },
  {
    vendorNum: 8,
    name: 'Verde & Saúde',
    description: 'Açaí, smoothies e pratos saudáveis cheios de energia.',
    business_type: 'saudavel',
    avg_prep_time: 10,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Bowl de Açaí Premium', description: 'Açaí, granola, banana, morango, mel, leite condensado', price: 28.90 },
      { category: 'Prato Principal', name: 'Poke Bowl Salmão', description: 'Arroz japonês, salmão, edamame, abacate, gengibre', price: 42.90 },
      { category: 'Prato Principal', name: 'Wrap Vegano', description: 'Húmus, legumes grelhados, rúcula, tomate seco', price: 28.90 },
      { category: 'Prato Principal', name: 'Tigela Proteica', description: 'Frango grelhado, quinoa, ovo, folhas e tahine', price: 36.90 },
      // Entradas
      { category: 'Entradas', name: 'Tábua de Frios Fit', description: 'Queijo branco, peito de peru, nozes e frutas secas', price: 32.90 },
      { category: 'Entradas', name: 'Chips de Couve', description: 'Assado no forno com azeite e sal rosa', price: 14.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Smoothie Verde Detox', description: 'Espinafre, pepino, maçã verde, gengibre e limão', price: 16.90 },
      { category: 'Bebidas', name: 'Vitamina de Frutas Vermelhas', description: 'Morango, framboesa, leite de amêndoas', price: 15.90 },
      { category: 'Bebidas', name: 'Água Aromatizada', description: 'Pepino e hortelã, 500ml', price: 8.90 },
      { category: 'Bebidas', name: 'Cold Brew', description: 'Café gelado preparado lentamente, 300ml', price: 13.90 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Mousse de Chocolate 70%', description: 'Sem glúten, sem lactose, adoçado com tâmaras', price: 16.90 },
      { category: 'Sobremesas', name: 'Crepioca de Banana', description: 'Crepioca com banana e pasta de amendoim', price: 14.90 },
    ]
  },
  {
    vendorNum: 9,
    name: 'Dragão Vermelho',
    description: 'Culinária chinesa autêntica: dim sum, noodles e mais.',
    business_type: 'chines',
    avg_prep_time: 18,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Pato Laqueado Beijing', description: 'Pato assado com molho hoisin, pepino e panquecas', price: 64.90 },
      { category: 'Prato Principal', name: 'Frango Kung Pao', description: 'Frango, amendoim, pimenta seca, molho agridoce', price: 38.90 },
      { category: 'Prato Principal', name: 'Mapo Tofu', description: 'Tofu sedoso, carne moída, pimenta szechuan', price: 32.90 },
      { category: 'Prato Principal', name: 'Lamen Char Siu', description: 'Caldo de missô, porco grelhado, ovo e nori', price: 44.90 },
      { category: 'Prato Principal', name: 'Camarão ao Molho XO', description: 'Camarão, alho, pimenta e molho XO artesanal', price: 52.90 },
      // Entradas
      { category: 'Entradas', name: 'Dim Sum (6 un)', description: 'Har Gao e Siu Mai de camarão e porco', price: 28.90 },
      { category: 'Entradas', name: 'Rolinho Primavera (4 un)', description: 'Crocante, recheio de legumes e carne', price: 19.90 },
      { category: 'Entradas', name: 'Sopa Won Ton', description: 'Caldo claro, won tons de camarão, cebolinha', price: 22.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Chá Pu-erh', description: 'Chá fermentado chinês, servido quente', price: 11.90 },
      { category: 'Bebidas', name: 'Soda de Lichi', description: 'Refrescante com soda e extrato de lichi', price: 10.90 },
      { category: 'Bebidas', name: 'Cerveja Tsingtao', description: 'Cerveja chinesa 355ml', price: 12.90 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Bolo de Lua', description: 'Massa de taro com recheio de feijão vermelho', price: 13.90 },
      { category: 'Sobremesas', name: 'Mangu de Coco Gelado', description: 'Pudim de arroz com leite de coco e manga', price: 14.90 },
    ]
  },
  {
    vendorNum: 10,
    name: 'Mar Aberto',
    description: 'Frutos do mar frescos: tapiocas, moquecas e ceviches.',
    business_type: 'frutos_do_mar',
    avg_prep_time: 22,
    items: [
      // Prato Principal
      { category: 'Prato Principal', name: 'Moqueca de Camarão', description: 'Camarão, leite de coco, dendê, coentro, arroz e pirão', price: 58.90 },
      { category: 'Prato Principal', name: 'Moqueca Mista', description: 'Peixe, camarão e lula, leite de coco e pimentões', price: 64.90 },
      { category: 'Prato Principal', name: 'Ceviche Clássico', description: 'Tilápia marinada no limão, cebola roxa, coentro e pimenta', price: 38.90 },
      { category: 'Prato Principal', name: 'Tapioca de Camarão', description: 'Camarão ao ajillo, catupiry e cebolinha', price: 32.90 },
      { category: 'Prato Principal', name: 'Peixe Grelhado com Crosta', description: 'Filé de robalo, crosta de ervas, legumes e purê', price: 52.90 },
      { category: 'Prato Principal', name: 'Arroz de Polvo', description: 'Polvo, arroz caldoso, tomate e limão siciliano', price: 56.90 },
      // Entradas
      { category: 'Entradas', name: 'Casquinha de Siri', description: 'Siri desfiado refogado com cebola e pimentão', price: 22.90 },
      { category: 'Entradas', name: 'Bolinho de Bacalhau (4 un)', description: 'Crocante por fora, cremoso por dentro', price: 26.90 },
      // Bebidas
      { category: 'Bebidas', name: 'Caipirinha de Maracujá', description: 'Refrescante com cachaça e maracujá fresco', price: 17.90 },
      { category: 'Bebidas', name: 'Suco de Caju', description: 'Natural, gelado, 400ml', price: 11.90 },
      { category: 'Bebidas', name: 'Cerveja Artesanal IPA', description: 'Leve e aromática, 400ml', price: 14.90 },
      // Sobremesas
      { category: 'Sobremesas', name: 'Tapioca de Coco com Morango', description: 'Tapioca doce com coco ralado e morangos frescos', price: 16.90 },
      { category: 'Sobremesas', name: 'Pudim de Tapioca', description: 'Com calda de caramelo e castanha do Pará', price: 13.90 },
    ]
  },
];

// ── RUNNER ────────────────────────────────────────────────────────────────────

async function getVendorUsers() {
  const r = await fetch(`${URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  });
  const d = await r.json();
  return (d.users ?? d).filter(u => u.email.startsWith('vendor'));
}

async function run() {
  const authUsers = await getVendorUsers();
  console.log(`Vendors encontrados: ${authUsers.length}\n`);

  const summary = [];

  for (const menu of MENUS) {
    const authUser = authUsers.find(u => u.email === `vendor${menu.vendorNum}@teste.com`);
    if (!authUser) { console.warn(`vendor${menu.vendorNum} não encontrado, pulando.`); continue; }

    process.stdout.write(`[vendor${menu.vendorNum}] ${menu.name}... `);

    // 1. Criar Organization
    const [org] = await post('organizations', {
      name: menu.name,
      slug: `${menu.business_type}-${menu.vendorNum}`,
      created_by: authUser.id,
    });

    // 2. Criar Event (só campos básicos)
    const [event] = await post('events', {
      organization_id: org.id,
      name: `${menu.name} — Evento Teste`,
      location: 'Pavilhão Central',
      active: true,
    });

    // 3. Criar Vendor
    const [vendor] = await post('vendors', {
      event_id: event.id,
      owner_id: authUser.id,
      name: menu.name,
      description: menu.description,
      avg_prep_time: menu.avg_prep_time,
      payment_mode: 'pay_on_pickup',
      accept_cash: true,
      accept_pix: true,
      accept_card: true,
      active: true,
      business_type: menu.business_type,
      table_delivery: false,
      service_fee_percentage: 0,
      couvert_fee: 0,
      active_coupon_code: null,
      discount_percentage: 0,
      allow_waiter_calls: true,
      num_tables: 0,
    });

    // 4. Criar MenuItems
    const items = menu.items.map((item, i) => ({
      vendor_id: vendor.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      available: true,
      position: i,
      image_url: null,
      extras: null,
    }));

    await post('menu_items', items);

    // Contar por categoria
    const cats = [...new Set(menu.items.map(i => i.category))];
    console.log(`OK (${menu.items.length} itens | ${cats.join(', ')})`);
    summary.push({ vendor: `vendor${menu.vendorNum}`, name: menu.name, itens: menu.items.length, categorias: cats });
  }

  console.log('\n══════════════════════════════════════════');
  console.log('RESUMO DOS CARDÁPIOS CRIADOS:');
  console.log('══════════════════════════════════════════');
  for (const s of summary) {
    console.log(`${s.vendor} → ${s.name}`);
    console.log(`         ${s.itens} itens | Categorias: ${s.categorias.join(' • ')}`);
  }
}

run().catch(console.error);
