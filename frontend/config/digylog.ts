export const DELIVERY_COMPANY = "Digylog";

export interface DigylogDestination {
  city: string;
  hub: string;
  delay: string;
  fee: number;
}

// Raw Digylog coverage (city / hub / delivery delay / fee). Parsed at module load.
const RAW_DIGYLOG = `
Agadir	Hub Agadir	1 j - 2 j	20.00 DH
Ait melloul	Hub Agadir	1 j - 2 j	20.00 DH
Inezgane	Hub Agadir	1 j - 2 j	20.00 DH
Dcheira El Jihadia	Hub Agadir	1 j - 3 j	20.00 DH
Tagadirt	Hub Agadir	1 j - 2 j	20.00 DH
Tikiouine	Hub Agadir	1 j - 3 j	20.00 DH
Bensergao	Hub Agadir	1 j - 3 j	20.00 DH
Tarrast	Hub Agadir	1 j - 3 j	20.00 DH
Port de pêche Agadir	Hub Agadir	4 j - 5 j	20.00 DH
Kasbah El Taher Ait melloul	Hub Agadir	1 j - 3 j	20.00 DH
Al Mazar Ait melloul	Hub Agadir	1 j - 3 j	20.00 DH
Drargua	Hub Agadir	1 j - 3 j	25.00 DH
Tamait Izder	Hub Agadir	1 j - 3 j	25.00 DH
Tigmi N Bobker	Hub Agadir	1 j - 3 j	25.00 DH
Anza	Hub Agadir	1 j - 3 j	25.00 DH
Azrou ait melloul	Hub Agadir	1 j - 3 j	25.00 DH
Taddart ANZA	Hub Agadir	4 j - 5 j	25.00 DH
Temsia	Hub Agadir	1 j - 6 j	30.00 DH
Lqliâa	Hub Agadir	1 j - 2 j	30.00 DH
Sidi Bibi	Hub Agadir	1 j - 2 j	30.00 DH
Ait Baha	Hub Agadir	1 j - 3 j	30.00 DH
Ikhourbane	Hub Agadir	1 j - 3 j	30.00 DH
Oulad Jerrar	Hub Agadir	1 j - 3 j	30.00 DH
Aéroport international Agadir	Hub Agadir	4 j - 5 j	30.00 DH
Houara	Hub Agadir	4 j - 5 j	30.00 DH
takad	Hub Agadir	4 j - 5 j	30.00 DH
Howara	Hub Agadir	1 j - 2 j	30.00 DH
Marrakech	Hub Marrakech	1 j - 2 j	35.00 DH
Casablanca	Hub Casablanca	1 j - 2 j	35.00 DH
Rabat	Hub Rabat	1 j - 2 j	35.00 DH
Tiznit	Hub Agadir	1 j - 2 j	35.00 DH
Biougra	Hub Agadir	1 j - 2 j	35.00 DH
Taroudannt	Hub Agadir	1 j - 2 j	35.00 DH
Belfaa	Hub Agadir	1 j - 2 j	35.00 DH
Temara	Hub Rabat	1 j - 2 j	35.00 DH
Sale	Hub Rabat	1 j - 2 j	35.00 DH
Kenitra	HUB - Kenitra	1 j - 3 j	35.00 DH
Oulad Teima	Hub Agadir	1 j - 2 j	35.00 DH
Oulad Dahou	Hub Agadir	1 j - 2 j	35.00 DH
Lagfifat	Hub Agadir	1 j - 3 j	35.00 DH
Aourir	Hub Agadir	1 j - 3 j	35.00 DH
Ait aamira	Hub Agadir	1 j - 3 j	35.00 DH
Taghazout	Hub Agadir	1 j - 2 j	35.00 DH
Sebt El Guerdane	Hub Agadir	2 j - 3 j	35.00 DH
Tin Mansour	Hub Agadir	1 j - 2 j	35.00 DH
Massa	Hub Agadir	1 j - 2 j	35.00 DH
Imi Imqqurn	Hub Agadir	1 j - 3 j	35.00 DH
Anounfeg	Hub Agadir	1 j - 3 j	35.00 DH
Tiguert	Hub Agadir	4 j - 5 j	35.00 DH
Plage Aghroud	Hub Agadir	4 j - 5 j	35.00 DH
Tadouarte agadir	Hub Agadir	4 j - 5 j	35.00 DH
Tamraght	Hub Agadir	1 j - 3 j	35.00 DH
Tanger	Hub Tanger	1 j - 2 j	40.00 DH
Tit Mellil	Hub Casablanca	1 j - 2 j	40.00 DH
Deroua	Hub Casablanca	1 j - 2 j	40.00 DH
Bouskoura	Hub Casablanca	1 j - 2 j	40.00 DH
Sala Al Jadida	Hub Rabat	1 j - 2 j	40.00 DH
Tetouan	Hub Tetouan	1 j - 2 j	40.00 DH
Larache	Hub Larache	1 j - 2 j	40.00 DH
Safi	Hub Safi	1 j - 2 j	40.00 DH
Guelmim	Hub Guelmim	1 j - 2 j	40.00 DH
Fes	Hub Fes	1 j - 2 j	40.00 DH
Mohammadia	Hub Casablanca	1 j - 2 j	40.00 DH
Martil	Hub Tetouan	1 j - 2 j	40.00 DH
Ain Harrouda	Hub Casablanca	1 j - 6 j	40.00 DH
Meknes	Hub Meknès	1 j - 2 j	40.00 DH
Laayoune	Hub Laayoun	1 j - 2 j	40.00 DH
EL Jadida	Hub EL Jadida	1 j - 2 j	40.00 DH
Oujda	Hub Oujda	1 j - 2 j	40.00 DH
Dar bouazza	Hub Casablanca	1 j - 3 j	40.00 DH
Settat	Hub Berrchid	1 j - 2 j	40.00 DH
Berrechid	Hub Berrchid	1 j - 3 j	40.00 DH
Khouribga	Hub Khouribga	1 j - 2 j	40.00 DH
Béni Mellal	Hub Beni Mellal	1 j - 2 j	40.00 DH
Essaouira	Hub Essaouira	1 j - 2 j	40.00 DH
Errahma	Hub Casablanca	1 j - 2 j	40.00 DH
Tan-Tan	Hub Tan-Tan	1 j - 2 j	40.00 DH
Bouznika	Hub Casablanca	1 j - 2 j	40.00 DH
Benslimane	Hub Casablanca	1 j - 2 j	40.00 DH
Tata	Hub Agadir	2 j - 3 j	40.00 DH
Sidi Hajjaj (tit mellil - Casa)	Hub Casablanca	1 j - 3 j	40.00 DH
Chellalate	Hub Casablanca	1 j - 3 j	40.00 DH
Tamaris	Hub Casablanca	1 j - 2 j	40.00 DH
Ait Aiaaza	Hub Agadir	1 j - 4 j	40.00 DH
Issen	Hub Agadir	1 j - 3 j	40.00 DH
El Boura	Hub Agadir	1 j - 4 j	40.00 DH
El Houmer	Hub Agadir	1 j - 4 j	40.00 DH
Azrarag	Hub Agadir	1 j - 3 j	40.00 DH
El Gara	Hub Berrchid	4 j - 5 j	40.00 DH
Nouayl	Hub Agadir	1 j - 3 j	40.00 DH
Ouled Aissa taroudant	Hub Agadir	1 j - 3 j	40.00 DH
Ain Tekki	Hub Casablanca	1 j - 3 j	40.00 DH
Ouled Aarfa traoudant	Hub Agadir	1 j - 3 j	40.00 DH
Boured	Hub Taza	1 j - 3 j	40.00 DH
Tizi Ouasli	Hub Taza	1 j - 3 j	40.00 DH
Aknoul	Hub Taza	1 j - 3 j	40.00 DH
Laâtamna	Hub - Taourirt	1 j - 3 j	40.00 DH
Fezouane	Hub - Taourirt	1 j - 3 j	40.00 DH
Lamriss	Hub Berkane	1 j - 3 j	40.00 DH
Sidi Moussa Lhamri	Hub Agadir	1 j - 3 j	40.00 DH
Ras El Ma Fes	Hub Fes	1 j - 3 j	40.00 DH
Lalla Takerkoust	Hub Marrakech	1 j - 6 j	40.00 DH
Igoudar	Hub - Chichaoua	1 j - 3 j	40.00 DH
Lmrah	Hub Marrakech	1 j - 6 j	40.00 DH
Amizmiz	Hub Marrakech	1 j - 3 j	40.00 DH
Sidi Bousberr	HUB - Kenitra	1 j - 6 j	40.00 DH
Teroual	HUB - Kenitra	1 j - 6 j	40.00 DH
Ain defali	HUB - Kenitra	1 j - 6 j	40.00 DH
Masmouda	HUB - Kenitra	1 j - 6 j	40.00 DH
Asjen	HUB - Kenitra	1 j - 6 j	40.00 DH
Beni quolla	HUB - Kenitra	1 j - 6 j	40.00 DH
Oulad bourahema	HUB - Kenitra	1 j - 6 j	40.00 DH
Sidi Ayache	HUB - Kenitra	1 j - 6 j	40.00 DH
N'khakhsa	HUB - Kenitra	1 j - 6 j	40.00 DH
Had oulad jelloul	HUB - Kenitra	1 j - 6 j	40.00 DH
Souk tlet du gharb	HUB - Kenitra	1 j - 6 j	40.00 DH
Ketama	Hub Hociema	1 j - 5 j	40.00 DH
Bni Boufrah	Hub Hociema	1 j - 5 j	40.00 DH
Tala Youssef	Hub Hociema	1 j - 5 j	40.00 DH
Ait youssef ou ali	Hub Hociema	1 j - 5 j	40.00 DH
Souani	Hub Hociema	1 j - 5 j	40.00 DH
Izemmouren	Hub Hociema	1 j - 5 j	40.00 DH
Rouadi	Hub Hociema	1 j - 5 j	40.00 DH
Sidi Boumoussa	Hub Agadir	4 j - 5 j	40.00 DH
lborj - Oulad teima	Hub Agadir	4 j - 5 j	40.00 DH
Oulad saleh bouskoura	Hub Casablanca	1 j - 3 j	40.00 DH
La ville verte	Hub Casablanca	1 j - 3 j	40.00 DH
sidi massoud sidi maarouf	Hub Casablanca	1 j - 3 j	40.00 DH
Victoria Bouskoura	Hub Casablanca	1 j - 3 j	40.00 DH
La Nouvelle Ville Ibn Batouta	Hub Tanger	1 j - 2 j	40.00 DH
Gueznaia	Hub Tanger	1 j - 2 j	40.00 DH
Touama	Hub Marrakech	1 j - 3 j	40.00 DH
Toufliht	Hub Marrakech	1 j - 3 j	40.00 DH
Souk El Had Zerkten	Hub Marrakech	1 j - 3 j	40.00 DH
Tizi N'Tichka	Hub Marrakech	1 j - 3 j	40.00 DH
Talnif - Marrakech	Hub Marrakech	1 j - 3 j	40.00 DH
Taddarte Tichka	Hub Marrakech	1 j - 3 j	40.00 DH
Aguelmouss ( Marrakech )	Hub Marrakech	1 j - 3 j	40.00 DH
Agouim	Hub Marrakech	1 j - 3 j	40.00 DH
Jemâa Feddalat	Hub Casablanca	1 j - 3 j	40.00 DH
Zenata	Hub Casablanca	1 j - 6 j	40.00 DH
Ben Mansour	HUB - Kenitra	1 j - 6 j	40.00 DH
Mediouna	Hub Casablanca	1 j - 2 j	45.00 DH
Dakhla	Hub Dakhla	2 j - 3 j	45.00 DH
Mdiq	Hub Tetouan	1 j - 2 j	45.00 DH
Fnideq	Hub Tetouan	1 j - 2 j	45.00 DH
Chefchaouen	Hub Tetouan	1 j - 2 j	45.00 DH
Aïn Atig	Hub Rabat	1 j - 2 j	45.00 DH
Sidi Bouknadel	Hub Rabat	1 j - 2 j	45.00 DH
Tamesna	Hub Rabat	1 j - 2 j	45.00 DH
Sidi Bouzid - El jadida	Hub EL Jadida	1 j - 2 j	45.00 DH
Moulay Abdellah Amghar	Hub EL Jadida	1 j - 2 j	45.00 DH
Jorf Lasfar	Hub EL Jadida	1 j - 2 j	45.00 DH
Ksar El Kébir	Hub Larache	1 j - 2 j	45.00 DH
Mehdia	HUB - Kenitra	1 j - 2 j	45.00 DH
Sidi Taibi	HUB - Kenitra	1 j - 6 j	45.00 DH
Sidi Yahya El Gharb	HUB - Kenitra	1 j - 2 j	45.00 DH
Errachidia	Hub - Errachidia	1 j - 2 j	45.00 DH
Arfoud	Hub - Errachidia	1 j - 2 j	45.00 DH
Goulmima - ouarzazate	Hub Ouarzazate	1 j - 2 j	45.00 DH
Rissani	Hub - Errachidia	1 j - 3 j	45.00 DH
Er-Rich	Hub - Errachidia	1 j - 6 j	45.00 DH
Taza	Hub Taza	1 j - 2 j	45.00 DH
Ben Ahmed (Berchid)	Hub Berrchid	2 j - 4 j	45.00 DH
Berkane	Hub - Taourirt	1 j - 2 j	45.00 DH
Nador	HUB - NADOR	1 j - 2 j	45.00 DH
Ouarzazate	Hub Ouarzazate	1 j - 2 j	45.00 DH
Selouane	HUB - NADOR	1 j - 2 j	45.00 DH
Al Aroui	HUB - NADOR	1 j - 2 j	45.00 DH
Segangan	HUB - NADOR	1 j - 2 j	45.00 DH
Beni ensar	HUB - NADOR	1 j - 2 j	45.00 DH
Ain El Aouda	Hub Rabat	1 j - 3 j	45.00 DH
Kasba Tadla	Hub Beni Mellal	1 j - 2 j	45.00 DH
Fquih Ben Salah	Hub Beni Mellal	1 j - 2 j	45.00 DH
El Ksiba	Hub Beni Mellal	1 j - 2 j	45.00 DH
Souk Sebt Oulad Nemma	Hub Beni Mellal	1 j - 2 j	45.00 DH
Oulad Ayad	Hub Beni Mellal	1 j - 2 j	45.00 DH
Afourar	Hub Beni Mellal	1 j - 3 j	45.00 DH
Oulad moussa (beni mellal)	Hub Beni Mellal	1 j - 2 j	45.00 DH
Bir Jdid	Hub EL Jadida	1 j - 6 j	45.00 DH
Lakhyayeta	Hub Casablanca	1 j - 2 j	45.00 DH
had soualem	Hub EL Jadida	1 j - 2 j	45.00 DH
Sidi Rehal	Hub Casablanca	1 j - 2 j	45.00 DH
Ait Ourir	Hub Marrakech	4 j - 5 j	45.00 DH
Tahanaout	Hub Marrakech	4 j - 5 j	45.00 DH
Souihla	Hub Marrakech	4 j - 5 j	45.00 DH
Ourika	Hub Marrakech	4 j - 5 j	45.00 DH
BELAAGUID	Hub Marrakech	1 j - 2 j	45.00 DH
Sidi Bou Othmane	Hub Marrakech	3 j - 4 j	45.00 DH
Tamansourt	Hub Marrakech	3 j - 5 j	45.00 DH
Sidi Zouine	Hub Marrakech	4 j - 5 j	45.00 DH
Loudaya	Hub Marrakech	4 j - 5 j	45.00 DH
Oulad Hassoun	Hub Marrakech	1 j - 2 j	45.00 DH
Khénifra	Hub Khénifra	1 j - 2 j	45.00 DH
M'rirt	Hub Khénifra	1 j - 3 j	45.00 DH
Azilal	Hub Beni Mellal	1 j - 3 j	45.00 DH
Al Hoceïma	Hub Hociema	1 j - 2 j	45.00 DH
Imzouren	Hub Hociema	1 j - 3 j	45.00 DH
Azemmour	Hub EL Jadida	3 j - 4 j	45.00 DH
Oued Zem	Hub Khouribga	1 j - 2 j	45.00 DH
Sidi Kacem	Hub Meknès	1 j - 2 j	45.00 DH
Sidi Slimane	Hub Meknès	1 j - 6 j	45.00 DH
Sebt Gezoula	Hub Safi	1 j - 2 j	45.00 DH
Skoura ( ouarzazate )	Hub Ouarzazate	1 j - 6 j	45.00 DH
Ahfir	Hub Berkane	1 j - 2 j	45.00 DH
Saïdia	Hub Berkane	1 j - 2 j	45.00 DH
Bni Drar	Hub Berkane	1 j - 3 j	45.00 DH
Ras El Ma	Hub Berkane	1 j - 3 j	45.00 DH
Sidi Bennour	Hub EL Jadida	1 j - 3 j	45.00 DH
Khemis Zemamra	Hub EL Jadida	1 j - 2 j	45.00 DH
Cafémaure	Hub - Taourirt	1 j - 2 j	45.00 DH
Oued Laou	Hub Tetouan	3 j - 5 j	45.00 DH
Ajdir	Hub Hociema	1 j - 2 j	45.00 DH
Bni Bouayach	Hub Hociema	1 j - 3 j	45.00 DH
Sidi Smaïl	Hub EL Jadida	1 j - 3 j	45.00 DH
Khémisset	Hub Meknès	2 j - 3 j	45.00 DH
Ouazzane	HUB - Kenitra	2 j - 3 j	45.00 DH
Tiflet	Hub Meknès	2 j - 3 j	45.00 DH
El Hajeb	Hub Meknès	2 j - 3 j	45.00 DH
Boufakrane	Hub Meknès	2 j - 3 j	45.00 DH
Sabaa Aiyoun	Hub Meknès	3 j - 4 j	45.00 DH
Tameslouht	Hub Marrakech	4 j - 5 j	45.00 DH
Nouasser	Hub Casablanca	1 j - 2 j	45.00 DH
Zaouïat Cheikh	Hub Beni Mellal	2 j - 3 j	45.00 DH
Youssoufia	Hub Safi	3 j - 4 j	45.00 DH
Jamâat Shaim	Hub Safi	2 j - 3 j	45.00 DH
Zeghanghane	HUB - NADOR	2 j - 3 j	45.00 DH
Targuist	Hub Hociema	3 j - 4 j	45.00 DH
Assilah	Hub Tanger	4 j - 5 j	45.00 DH
Ksar Sghir	Hub Tanger	4 j - 5 j	45.00 DH
El Mansouria	Hub Casablanca	1 j - 2 j	45.00 DH
Guercif	Hub Taza	3 j - 4 j	45.00 DH
Demnate	Hub Beni Mellal	2 j - 3 j	45.00 DH
Tahla	Hub Taza	3 j - 4 j	45.00 DH
Oued Amlil	Hub Taza	3 j - 4 j	45.00 DH
Farkhana	HUB - NADOR	3 j - 4 j	45.00 DH
Azrou	Hub Meknès	2 j - 3 j	45.00 DH
Ifrane	Hub Meknès	2 j - 3 j	45.00 DH
Moulay Idriss Zerhoun	Hub Meknès	3 j - 4 j	45.00 DH
Bejaâd	Hub Beni Mellal	2 j - 3 j	45.00 DH
El Marsa (Laayoune)	Hub Laayoun	4 j - 6 j	45.00 DH
El Kelaâ des Sraghna	Hub Beni Mellal	3 j - 4 j	45.00 DH
Lâattaouia	Hub Beni Mellal	2 j - 3 j	45.00 DH
Echemmaia	Hub Safi	3 j - 4 j	45.00 DH
Ounagha	Hub Essaouira	2 j - 3 j	45.00 DH
Smimou	Hub Essaouira	3 j - 4 j	45.00 DH
Tamanar	Hub Essaouira	3 j - 4 j	45.00 DH
Talmest	Hub Essaouira	3 j - 4 j	45.00 DH
Midelt	Hub Midelt	3 j - 4 j	45.00 DH
Tinghir	Hub Ouarzazate	3 j - 4 j	45.00 DH
Tinejdad	Hub Ouarzazate	3 j - 4 j	45.00 DH
Aoufous	Hub - Errachidia	3 j - 4 j	45.00 DH
Kelaat-M'Gouna	Hub Ouarzazate	3 j - 4 j	45.00 DH
Boumalne-Dadès	Hub Ouarzazate	3 j - 4 j	45.00 DH
Ain Taoujdate	Hub Meknès	1 j - 2 j	45.00 DH
Harhoura	Hub Rabat	1 j - 2 j	45.00 DH
Aklim	Hub - Taourirt	3 j - 4 j	45.00 DH
Zaïo	HUB - NADOR	2 j - 3 j	45.00 DH
Bab Taza	Hub Tetouan	3 j - 4 j	45.00 DH
Boumia	Hub Midelt	3 j - 4 j	45.00 DH
Zaïda	Hub Midelt	3 j - 4 j	45.00 DH
Bouizakarne	Hub Guelmim	3 j - 4 j	45.00 DH
Skhinat fes	Hub Fes	2 j - 3 j	45.00 DH
Skhirate	Hub Rabat	1 j - 2 j	45.00 DH
Agdz	Hub Ouarzazate	3 j - 4 j	45.00 DH
Tazenakht	Hub Ouarzazate	4 j - 5 j	45.00 DH
Akka	Hub Agadir	3 j - 4 j	45.00 DH
Foum Zguid	Hub Agadir	3 j - 4 j	45.00 DH
Foum EL Hassane	Hub Agadir	3 j - 4 j	45.00 DH
Igherm	Hub Agadir	3 j - 4 j	45.00 DH
Isafen	Hub Agadir	3 j - 4 j	45.00 DH
Séfrou	Hub Fes	2 j - 3 j	45.00 DH
Bhalil	Hub Fes	2 j - 3 j	45.00 DH
Chichaoua	Hub - Chichaoua	2 j - 3 j	45.00 DH
Imouzzer Kandar	Hub Fes	2 j - 3 j	45.00 DH
Aïn Cheggag	Hub Fes	3 j - 4 j	45.00 DH
El Menzel	Hub Fes	3 j - 4 j	45.00 DH
Ain Beda	Hub Fes	2 j - 3 j	45.00 DH
Sidi Khiar Kandar	Hub Fes	2 j - 3 j	45.00 DH
Bab Berred	Hub Tetouan	4 j - 5 j	45.00 DH
Ouled Tayeb	Hub Fes	2 j - 3 j	45.00 DH
Madagh	Hub - Taourirt	3 j - 4 j	45.00 DH
Taourirt	Hub - Taourirt	2 j - 3 j	45.00 DH
Souk El Arbaa	HUB - Kenitra	2 j - 3 j	45.00 DH
Bel Ksiri	HUB - Kenitra	2 j - 3 j	45.00 DH
Moulay Bousselham	HUB - Kenitra	3 j - 4 j	45.00 DH
Mechra Bel Ksiri	HUB - Kenitra	2 j - 3 j	45.00 DH
El Aïoun Sidi Mellouk	Hub Berkane	2 j - 3 j	45.00 DH
El Aioun Oriental	Hub Berkane	2 j - 3 j	45.00 DH
Boujniba	Hub Khouribga	1 j - 2 j	45.00 DH
Jaâdar	HUB - NADOR	2 j - 3 j	45.00 DH
Driouch	HUB - NADOR	2 j - 3 j	45.00 DH
Tiztoutine	HUB - NADOR	3 j - 5 j	45.00 DH
Ben Guerir	Hub Marrakech	2 j - 3 j	45.00 DH
Moulay Yaâcoub	Hub Fes	3 j - 4 j	45.00 DH
Imintanoute	Hub - Chichaoua	2 j - 3 j	45.00 DH
Sid L'Mokhtar	Hub - Chichaoua	2 j - 3 j	45.00 DH
Tafoughalt	Hub Berkane	3 j - 4 j	45.00 DH
Jerada	Hub Berkane	3 j - 4 j	45.00 DH
Ain Chqef	Hub Fes	2 j - 3 j	45.00 DH
Ghazoua	Hub Essaouira	2 j - 3 j	45.00 DH
Oualidia	Hub EL Jadida	3 j - 4 j	45.00 DH
Tnine Chtouka - El jadida	Hub EL Jadida	4 j - 5 j	45.00 DH
Sidi Abed - El jadida	Hub EL Jadida	4 j - 5 j	45.00 DH
Sidi Jaber	Hub Beni Mellal	1 j - 2 j	45.00 DH
Bradia	Hub Beni Mellal	1 j - 2 j	45.00 DH
Taghzirt	Hub Beni Mellal	2 j - 3 j	45.00 DH
Oulad Frej	Hub EL Jadida	4 j - 5 j	45.00 DH
Midar	HUB - NADOR	3 j - 4 j	45.00 DH
Ben Taïeb	HUB - NADOR	2 j - 3 j	45.00 DH
Kariat Arekmane	HUB - NADOR	3 j - 5 j	45.00 DH
Bouarg	HUB - NADOR	3 j - 5 j	45.00 DH
Aïn Dorij	HUB - Kenitra	2 j - 3 j	45.00 DH
Zoumi	HUB - Kenitra	2 j - 3 j	45.00 DH
Sidi Redouane	HUB - Kenitra	2 j - 3 j	45.00 DH
Ait Aissa oubrahim	Hub Ouarzazate	2 j - 3 j	45.00 DH
Timatraouine	Hub Ouarzazate	5 j - 6 j	45.00 DH
Imider	Hub Ouarzazate	5 j - 6 j	45.00 DH
Taounate	Hub Fes	3 j - 4 j	45.00 DH
Tissa	Hub Fes	3 j - 4 j	45.00 DH
ain aicha	Hub Fes	3 j - 4 j	45.00 DH
Missour	Hub Midelt	3 j - 4 j	45.00 DH
Boulemane	Hub Midelt	3 j - 4 j	45.00 DH
Merzouga	Hub - Errachidia	3 j - 4 j	45.00 DH
Zagora	Hub Ouarzazate	3 j - 4 j	45.00 DH
Aguim	Hub Ouarzazate	4 j - 5 j	45.00 DH
Figuig	Hub Berkane	2 j - 3 j	45.00 DH
Bouarfa	Hub Berkane	3 j - 4 j	45.00 DH
Tendrara	Hub Berkane	2 j - 3 j	45.00 DH
Tafersit	HUB - NADOR	2 j - 3 j	45.00 DH
Kassita	HUB - NADOR	4 j - 6 j	45.00 DH
Dar El Kebdani	HUB - NADOR	4 j - 6 j	45.00 DH
Boudinar	HUB - NADOR	4 j - 6 j	45.00 DH
Krona	HUB - NADOR	4 j - 6 j	45.00 DH
Tamsamane	HUB - NADOR	4 j - 6 j	45.00 DH
Boujdour	Hub Boujdour	3 j - 5 j	45.00 DH
Es-Semara	Hub Smara	3 j - 4 j	45.00 DH
El Aouamra	Hub Larache	1 j - 2 j	45.00 DH
Khémis Sahel	Hub Larache	1 j - 3 j	45.00 DH
Ouled Hammou	Hub Larache	1 j - 3 j	45.00 DH
Tighassaline	Hub Khénifra	4 j - 6 j	45.00 DH
Aït Ishaq	Hub Khénifra	4 j - 6 j	45.00 DH
Haj Kaddour	Hub Meknès	1 j - 2 j	45.00 DH
Bni Chiker	HUB - NADOR	3 j - 4 j	45.00 DH
Issaguen	Hub Hociema	3 j - 4 j	45.00 DH
Boukidan	Hub Hociema	3 j - 4 j	45.00 DH
El Hanchane	Hub Essaouira	2 j - 3 j	45.00 DH
El Ouatia (Tan-Tan)	Hub Tan-Tan	2 j - 4 j	45.00 DH
Boudnib	Hub - Errachidia	4 j - 6 j	45.00 DH
Outat El Haj	Hub Midelt	3 j - 4 j	45.00 DH
AGHBALOU N'CERDAN	Hub Midelt	3 j - 4 j	45.00 DH
Itzer	Hub Midelt	3 j - 4 j	45.00 DH
Sidi Ifni	Hub Sidi Ifni	3 j - 4 j	45.00 DH
Tafraout	Hub Agadir	3 j - 4 j	45.00 DH
Oulad Berhil	Hub Agadir	3 j - 4 j	45.00 DH
Aoulouz	Hub Agadir	4 j - 5 j	45.00 DH
Ouled Ghanem	Hub EL Jadida	6 j - 8 j	45.00 DH
Msawar Rasso	Hub EL Jadida	4 j - 5 j	45.00 DH
Tamallalt	Hub Beni Mellal	2 j - 3 j	45.00 DH
Assahrij	Hub Beni Mellal	2 j - 3 j	45.00 DH
Sidi Allal Tazi	HUB - Kenitra	2 j - 3 j	45.00 DH
Bouyafar	HUB - NADOR	4 j - 6 j	45.00 DH
Assa	Hub Assa	4 j - 6 j	45.00 DH
Zag	Hub Assa	5 j - 7 j	45.00 DH
Skhour Rehamna	Hub Marrakech	3 j - 4 j	45.00 DH
Aïn Bni Mathar	Hub Berkane	5 j - 7 j	45.00 DH
Mariouari	HUB - NADOR	4 j - 6 j	45.00 DH
Ouled Settout	HUB - NADOR	4 j - 6 j	45.00 DH
Mzoudia	Hub - Chichaoua	2 j - 3 j	45.00 DH
Mejjat	Hub - Chichaoua	2 j - 3 j	45.00 DH
Aguelmous ( khenifra )	Hub Khénifra	5 j - 7 j	45.00 DH
Elbarj ( Khenifra )	Hub Khénifra	5 j - 7 j	45.00 DH
Lahri	Hub Khénifra	5 j - 7 j	45.00 DH
Bni Hadifa	Hub Hociema	1 j - 1 j	45.00 DH
Bouanane	Hub Berkane	4 j - 7 j	45.00 DH
Aïn Karma	Hub Meknès	3 j - 6 j	45.00 DH
Sidi sliman Mol kifan	Hub Meknès	3 j - 7 j	45.00 DH
Boderbala	Hub Meknès	3 j - 7 j	45.00 DH
Ain Arma	Hub Meknès	3 j - 7 j	45.00 DH
Dar Oum Sultan	Hub Meknès	3 j - 7 j	45.00 DH
Tlat Loulad	Hub Khouribga	3 j - 7 j	45.00 DH
Ait Qamra	Hub Hociema	4 j - 8 j	45.00 DH
Ajdir Igzennayen	Hub Taza	4 j - 8 j	45.00 DH
Oulad Ghadbane	Hub EL Jadida	3 j - 6 j	45.00 DH
Ouaoumana	Hub Khénifra	4 j - 7 j	45.00 DH
El kebab	Hub Khénifra	4 j - 7 j	45.00 DH
Had Bouhssoussen	Hub Khénifra	4 j - 7 j	45.00 DH
Tighza mrirt	Hub Khénifra	4 j - 7 j	45.00 DH
Moulay Bouazza	Hub Khénifra	4 j - 7 j	45.00 DH
Kef en Nsour	Hub Khénifra	4 j - 7 j	45.00 DH
Sebt Ait Rahhou	Hub Khénifra	4 j - 7 j	45.00 DH
Oued Laabid	Hub Beni Mellal	4 j - 7 j	45.00 DH
Bzou	Hub Beni Mellal	4 j - 7 j	45.00 DH
El Borouj	Hub Beni Mellal	3 j - 7 j	45.00 DH
El Menzeh	Hub Rabat	3 j - 7 j	45.00 DH
Sidi Yahya Zaër	Hub Rabat	3 j - 7 j	45.00 DH
Tazarine	Hub Ouarzazate	4 j - 6 j	45.00 DH
Nkob	Hub Ouarzazate	4 j - 6 j	45.00 DH
Tamezmoute	Hub Ouarzazate	4 j - 6 j	45.00 DH
Tinzouline	Hub Ouarzazate	4 j - 6 j	45.00 DH
Tamegroute	Hub Ouarzazate	4 j - 6 j	45.00 DH
Tagounite	Hub Ouarzazate	4 j - 6 j	45.00 DH
M'Hamid El Ghizlane	Hub Ouarzazate	4 j - 6 j	45.00 DH
Bni Zoli	Hub Ouarzazate	4 j - 6 j	45.00 DH
Jorf El Melha	HUB - Kenitra	4 j - 6 j	45.00 DH
Sidi Allal El Bahraoui	Hub Rabat	1 j - 3 j	45.00 DH
Lalla Mimouna	HUB - Kenitra	1 j - 3 j	45.00 DH
Dlalha	HUB - Kenitra	1 j - 3 j	45.00 DH
Sebt Jahjouh	Hub Meknès	2 j - 4 j	45.00 DH
Sidi Ali Ban Hamdouche ( Meknes )	Hub Meknès	2 j - 4 j	45.00 DH
Dkhissa	Hub Meknès	2 j - 4 j	45.00 DH
Kantina	Hub Meknès	1 j - 3 j	45.00 DH
Ait Yaazem	Hub Meknès	1 j - 3 j	45.00 DH
Sidi Moussa El Mejdoub	Hub Casablanca	1 j - 3 j	45.00 DH
Mirleft	Hub Sidi Ifni	1 j - 5 j	45.00 DH
Bouguedra	Hub Safi	1 j - 6 j	45.00 DH
Moulay Brahim	Hub Marrakech	1 j - 6 j	45.00 DH
Asni	Hub Marrakech	1 j - 6 j	45.00 DH
Chwiter	Hub Marrakech	1 j - 6 j	45.00 DH
Aglou	Hub Agadir	1 j - 4 j	45.00 DH
Oulad Yaich	Hub Beni Mellal	1 j - 3 j	45.00 DH
Sidi Abdallah Ghiat	Hub Marrakech	1 j - 4 j	45.00 DH
Boulanouare	Hub Khouribga	1 j - 4 j	45.00 DH
Hattane	Hub Khouribga	1 j - 3 j	45.00 DH
Cabo Negro	Hub Tetouan	1 j - 3 j	45.00 DH
Marina Smir	Hub Tetouan	1 j - 3 j	45.00 DH
Bab Taliouane - Tétouan	Hub Tetouan	1 j - 3 j	45.00 DH
Dardara	Hub Tetouan	1 j - 3 j	45.00 DH
chrafate chefchaouen	Hub Tetouan	1 j - 3 j	45.00 DH
Tamernout	Hub Tetouan	1 j - 3 j	45.00 DH
Aouchtame	Hub Tetouan	1 j - 3 j	45.00 DH
Tamrabet	Hub Tetouan	1 j - 3 j	45.00 DH
Azla	Hub Tetouan	1 j - 3 j	45.00 DH
Amsa	Hub Tetouan	1 j - 3 j	45.00 DH
Ribate El Kheir	Hub Fes	1 j - 3 j	45.00 DH
Ain Allah	Hub Fes	1 j - 5 j	45.00 DH
Ain Seddaq	Hub Agadir	1 j - 3 j	45.00 DH
Majjate meknes	Hub Meknès	1 j - 3 j	45.00 DH
Bir Tam Tam	Hub Fes	1 j - 3 j	45.00 DH
Ouled Mbarek	Hub Beni Mellal	1 j - 3 j	45.00 DH
ras el ma ifrane	Hub Meknès	1 j - 3 j	45.00 DH
TIGENZIWINE	Hub Marrakech	1 j - 6 j	45.00 DH
Ben Yakhlef	Hub Casablanca	1 j - 3 j	45.00 DH
Sidi Harazem	Hub Fes	1 j - 3 j	45.00 DH
Ait ben hadou	Hub Ouarzazate	1 j - 4 j	45.00 DH
khmis dades	Hub Ouarzazate	1 j - 4 j	45.00 DH
laaroumiate	Hub Ouarzazate	1 j - 4 j	45.00 DH
idelsan	Hub Ouarzazate	1 j - 4 j	45.00 DH
Taghezout ouarzazate	Hub Ouarzazate	1 j - 4 j	45.00 DH
Sidi Bettache	Hub Rabat	1 j - 2 j	45.00 DH
Rommani	Hub Rabat	1 j - 2 j	45.00 DH
Karia ba mohamed	Hub Fes	4 j - 5 j	45.00 DH
Tamesna Meknes	Hub Meknès	1 j - 2 j	45.00 DH
Laakarta	Hub EL Jadida	3 j - 4 j	45.00 DH
kasbat Ayir	Hub EL Jadida	3 j - 4 j	45.00 DH
heyout chair	Hub EL Jadida	3 j - 4 j	45.00 DH
Ahiout El kohia	Hub EL Jadida	3 j - 4 j	45.00 DH
El Menaadla El jadida	Hub EL Jadida	3 j - 4 j	45.00 DH
Laatamena el jadida	Hub EL Jadida	3 j - 4 j	45.00 DH
Douar wald El aisase	Hub EL Jadida	3 j - 4 j	45.00 DH
Lota	Hub EL Jadida	3 j - 4 j	45.00 DH
El bouchtiaine	Hub EL Jadida	3 j - 4 j	45.00 DH
Lkrouchiaine	Hub EL Jadida	3 j - 4 j	45.00 DH
Dar 40	Hub EL Jadida	3 j - 4 j	45.00 DH
Sad rouida	Hub EL Jadida	3 j - 4 j	45.00 DH
Tadouart tiznit	Hub Agadir	3 j - 4 j	45.00 DH
Lakhssas	Hub Agadir	4 j - 5 j	45.00 DH
Tafraout N'Lakhsass	Hub Agadir	4 j - 5 j	45.00 DH
Mirght	Hub Agadir	4 j - 5 j	45.00 DH
El Aargoube	Hub Agadir	4 j - 5 j	45.00 DH
Reggada ( agadir )	Hub Agadir	4 j - 5 j	45.00 DH
Agouray	Hub Meknès	4 j - 5 j	45.00 DH
Taloust	Hub Agadir	4 j - 5 j	45.00 DH
Laaouina	Hub Agadir	4 j - 5 j	45.00 DH
Sidi ali borekba	Hub Taza	3 j - 4 j	45.00 DH
Taddart guercif	Hub Taza	3 j - 4 j	45.00 DH
Msoun	Hub Taza	3 j - 4 j	45.00 DH
SAKA guercif	Hub Taza	3 j - 4 j	45.00 DH
Bab Marzouka	Hub Taza	3 j - 4 j	45.00 DH
had oulad zbayer	Hub Taza	3 j - 4 j	45.00 DH
Abaynou	Hub Guelmim	3 j - 4 j	45.00 DH
asrir	Hub Guelmim	3 j - 4 j	45.00 DH
tighmert	Hub Guelmim	3 j - 4 j	45.00 DH
ouaaroun	Hub Guelmim	3 j - 4 j	45.00 DH
laqsabi	Hub Guelmim	3 j - 4 j	45.00 DH
Daouar tikni	Hub EL Jadida	3 j - 4 j	45.00 DH
Daouar tajin	Hub EL Jadida	3 j - 4 j	45.00 DH
Tamawanza	Hub Agadir	4 j - 5 j	45.00 DH
Aghzdisse	Hub Agadir	4 j - 5 j	45.00 DH
Lakhnafif	Hub Agadir	4 j - 5 j	45.00 DH
Bouaassida	Hub Agadir	4 j - 5 j	45.00 DH
Al Hadib	Hub Agadir	4 j - 5 j	45.00 DH
Labaarir	Hub Agadir	4 j - 5 j	45.00 DH
Baakila	Hub Agadir	4 j - 5 j	45.00 DH
Lhmadate	Hub Agadir	4 j - 5 j	45.00 DH
Oulad Brahim ouled teima	Hub Agadir	4 j - 5 j	45.00 DH
Idaousmlal	Hub Agadir	4 j - 5 j	45.00 DH
Anzi	Hub Agadir	4 j - 5 j	45.00 DH
Tighirt TIZNIT	Hub Agadir	4 j - 5 j	45.00 DH
El Maader El Kabir	Hub Agadir	4 j - 5 j	45.00 DH
Hassi al bagar	Hub Agadir	4 j - 5 j	45.00 DH
ait mimoun	Hub Agadir	4 j - 5 j	45.00 DH
ihchach CHTOUKA	Hub Agadir	4 j - 5 j	45.00 DH
tin amara	Hub Agadir	4 j - 5 j	45.00 DH
niya	Hub Agadir	4 j - 5 j	45.00 DH
agouram	Hub Agadir	4 j - 5 j	45.00 DH
ait botayeb	Hub Agadir	4 j - 5 j	45.00 DH
ait ali	Hub Agadir	4 j - 5 j	45.00 DH
khayz	Hub Agadir	4 j - 5 j	45.00 DH
inchaden	Hub Agadir	4 j - 5 j	45.00 DH
okhrib	Hub Agadir	4 j - 5 j	45.00 DH
El kharij	Hub Agadir	4 j - 5 j	45.00 DH
lkharba	Hub Agadir	4 j - 5 j	45.00 DH
ighrissen	Hub Agadir	4 j - 5 j	45.00 DH
Oum El Guerdane	Hub Agadir	4 j - 5 j	45.00 DH
Addiss	Hub Agadir	4 j - 5 j	45.00 DH
Tazarte	Hub Agadir	4 j - 5 j	45.00 DH
Aguinane	Hub Agadir	4 j - 5 j	45.00 DH
Akka Ighane	Hub Agadir	4 j - 5 j	45.00 DH
Tagmout	Hub Agadir	4 j - 5 j	45.00 DH
Issafn TATA	Hub Agadir	4 j - 5 j	45.00 DH
Tissint TATA	Hub Agadir	4 j - 5 j	45.00 DH
Foum Jemaa	Hub Beni Mellal	1 j - 2 j	45.00 DH
Tanant azilal	Hub Beni Mellal	1 j - 2 j	45.00 DH
dar Ouled Zidouh	Hub Beni Mellal	1 j - 2 j	45.00 DH
tassaout	Hub Beni Mellal	1 j - 2 j	45.00 DH
Oulad Youssef	Hub Beni Mellal	1 j - 2 j	45.00 DH
El Mghassiyine	Hub Meknès	2 j - 4 j	45.00 DH
Sidi Ali Ban Hamdouche eljadida	Hub EL Jadida	3 j - 4 j	45.00 DH
EL BAHARA	Hub EL Jadida	3 j - 4 j	45.00 DH
DOUAR CHHAB	Hub EL Jadida	3 j - 4 j	45.00 DH
Lfahs el jadida	Hub EL Jadida	3 j - 4 j	45.00 DH
Chwiref eljadida	Hub EL Jadida	3 j - 4 j	45.00 DH
Wlad hssin eljadida	Hub EL Jadida	3 j - 4 j	45.00 DH
Bzat	Hub EL Jadida	3 j - 4 j	45.00 DH
Barakat hssina	Hub EL Jadida	3 j - 4 j	45.00 DH
Laakba lhamra	Hub EL Jadida	3 j - 4 j	45.00 DH
Saniat berghig	Hub EL Jadida	3 j - 4 j	45.00 DH
Bni khlef eljadia	Hub EL Jadida	3 j - 4 j	45.00 DH
Biriz	Hub EL Jadida	3 j - 4 j	45.00 DH
Merchouch	Hub Rabat	1 j - 2 j	45.00 DH
Chrifia Marrakech	Hub Marrakech	1 j - 6 j	45.00 DH
Ouled Aïssa	Hub EL Jadida	6 j - 8 j	45.00 DH
Guigou	Hub Midelt	3 j - 4 j	45.00 DH
El Aarjate	Hub Rabat	1 j - 3 j	45.00 DH
Ouahat Sidi Brahim	Hub Marrakech	1 j - 2 j	45.00 DH
Nzalat Laadam	Hub Marrakech	3 j - 4 j	45.00 DH
Ouled Jelal Marrakech	Hub Marrakech	1 j - 2 j	45.00 DH
Sebt Mzouda	Hub - Chichaoua	2 j - 3 j	45.00 DH
Idouirane	Hub - Chichaoua	2 j - 3 j	45.00 DH
Znada	Hub - Chichaoua	2 j - 3 j	45.00 DH
Borj Agharghar	Hub - Chichaoua	2 j - 3 j	45.00 DH
Sidi Ettiji	Hub Safi	3 j - 4 j	45.00 DH
Jdour	Hub Safi	3 j - 4 j	45.00 DH
Laaouissate	Hub Safi	3 j - 4 j	45.00 DH
Sbiaat	Hub Safi	3 j - 4 j	45.00 DH
Thine Riate	Hub Safi	1 j - 2 j	45.00 DH
Ouled zekri	Hub Safi	3 j - 4 j	45.00 DH
Lakhechachena	Hub Safi	3 j - 4 j	45.00 DH
Ben Rahmoun marrakech	Hub Marrakech	1 j - 2 j	45.00 DH
Sidi Hejjaj (ben ahmed)	Hub Berrchid	4 j - 5 j	45.00 DH
Houara tanger	Hub Tanger	4 j - 5 j	45.00 DH
Dayedaate	Hub Tanger	4 j - 5 j	45.00 DH
Briyech	Hub Tanger	4 j - 5 j	45.00 DH
Taliouine	Hub Agadir	4 j - 5 j	45.00 DH
Assaki Taliouine	Hub Agadir	4 j - 5 j	45.00 DH
Tassoultante	Hub Marrakech	1 j - 6 j	45.00 DH
Sebt Ben Sassi	Hub Marrakech	1 j - 2 j	45.00 DH
Laamamcha	Hub Berrchid	4 j - 5 j	45.00 DH
Sidi El Ayedi	Hub Berrchid	4 j - 5 j	45.00 DH
Ighoud	Hub - Chichaoua	2 j - 3 j	45.00 DH
Sidi chiker	Hub - Chichaoua	2 j - 3 j	45.00 DH
Taouloukoult	Hub - Chichaoua	2 j - 3 j	45.00 DH
Timezgadiouine	Hub - Chichaoua	2 j - 3 j	45.00 DH
Ain beida chichaoua	Hub - Chichaoua	2 j - 3 j	45.00 DH
Ait hadi	Hub - Chichaoua	2 j - 3 j	45.00 DH
Sidi bouzid chichaoua	Hub - Chichaoua	2 j - 3 j	45.00 DH
Tafetachte	Hub Essaouira	2 j - 3 j	45.00 DH
Had El Brachoua	Hub Rabat	1 j - 2 j	45.00 DH
Khenichet	HUB - Kenitra	4 j - 6 j	45.00 DH
Lagouassem	Hub Marrakech	1 j - 6 j	45.00 DH
Aïn Sfa	Hub Berkane	3 j - 4 j	45.00 DH
Talsint	Hub Berkane	3 j - 4 j	45.00 DH
Aghmat	Hub Marrakech	4 j - 5 j	45.00 DH
Sidi Moussa Marrakech	Hub Marrakech	1 j - 6 j	45.00 DH
Ben Rahmoun	Hub Marrakech	1 j - 2 j	45.00 DH
Ahdil	Hub - Chichaoua	2 j - 3 j	45.00 DH
Dar Gueddari	HUB - Kenitra	2 j - 3 j	45.00 DH
Ouaouizeght	Hub Beni Mellal	1 j - 3 j	45.00 DH
Tarfaya	Hub Laayoun	4 j - 6 j	45.00 DH
Akhfennir	Hub Tan-Tan	2 j - 4 j	45.00 DH
Had Kourt	HUB - Kenitra	2 j - 3 j	45.00 DH
Ras Tbouda	Hub Fes	1 j - 3 j	45.00 DH
Oulad Bou Abid	Hub Fes	3 j - 4 j	45.00 DH
Saïss	Hub Fes	3 j - 4 j	45.00 DH
Souiria	Hub Safi	1 j - 2 j	45.00 DH
Sidi Moussa Ben Ali	Hub Casablanca	1 j - 3 j	45.00 DH
Oulmès	Hub Khénifra	4 j - 6 j	45.00 DH
Ksar Bjir	Hub Larache	1 j - 2 j	45.00 DH
Cascade ouzoud	Hub Beni Mellal	1 j - 3 j	45.00 DH
Imsouane	Hub Essaouira	3 j - 4 j	45.00 DH
Sidi Kaouki	Hub Essaouira	2 j - 3 j	45.00 DH
Ait Daoud	Hub Essaouira	2 j - 3 j	45.00 DH
Smara	Hub Smara	3 j - 4 j	45.00 DH
Jerf Arfoud	Hub - Errachidia	3 j - 4 j	45.00 DH
akermoud	Hub Essaouira	2 j - 3 j	45.00 DH
aghbalou nserdane ( Khenifra )	Hub Khénifra	5 j - 7 j	45.00 DH
Birkouate	Hub Essaouira	3 j - 4 j	45.00 DH
Ain jiri	Hub Meknès	3 j - 7 j	45.00 DH
Ain Salama	Hub Meknès	3 j - 7 j	45.00 DH
ARBAOUA	Hub Larache	1 j - 2 j	45.00 DH
Louizia	Hub Casablanca	1 j - 3 j	45.00 DH
Had gharbia	Hub Tanger	4 j - 5 j	45.00 DH
Beni Ayat	Hub Beni Mellal	1 j - 2 j	45.00 DH
Sidi Yahya ousaad	Hub Khénifra	5 j - 7 j	45.00 DH
Douar El ghorba	Hub EL Jadida	3 j - 4 j	45.00 DH
Bassatine El Menzeh	Hub Rabat	3 j - 7 j	45.00 DH
verifey_by_callcenter	HUB CALL CENTER	3 j - 4 j	45.00 DH
`;

const DESTINATIONS: DigylogDestination[] = RAW_DIGYLOG.split("\n")
  .map((line) => line.trim())
  .filter((line) => line && line !== "__DATA__")
  .map((line) => {
    const match = line.match(/^(.+?)\s+((?:Hub|HUB)\b.*?)\s+(\d+\s*j\s*-\s*\d+\s*j)\s+([\d.]+)\s*DH$/);
    if (!match) return null;
    return { city: match[1].trim(), hub: match[2].trim(), delay: match[3].trim(), fee: parseFloat(match[4]) };
  })
  .filter((item): item is DigylogDestination => item !== null);

export const DIGYLOG_DESTINATIONS = DESTINATIONS;

// Unique, sorted city names for the delivery city selector.
export const DIGYLOG_CITIES = Array.from(new Set(DESTINATIONS.map((d) => d.city))).sort((a, b) =>
  a.localeCompare(b, "fr")
);

// Quick lookup of the delivery fee by exact city name.
export const DIGYLOG_FEE_BY_CITY: Record<string, number> = DESTINATIONS.reduce<Record<string, number>>((acc, d) => {
  if (!(d.city in acc)) acc[d.city] = d.fee;
  return acc;
}, {});
