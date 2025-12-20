import React from 'react';
import {View} from 'react-native';
import {HeroBlock} from './HeroBlock';
import {TextBlock} from './TextBlock';
import {OfferGridBlock} from './OfferGridBlock';
import {FallbackBlock} from './FallbackBlock';

interface Block {
	type: string;
	props: any;
}

interface BlocksRendererProps {
	blocks: Block[];
}

/**
 * BlocksRenderer
 * 
 * Nimmt eine Liste von Blöcken entgegen und rendert die entsprechende Komponente
 * für jeden Block-Typ. Unbekannte Typen werden über den FallbackBlock abgefangen.
 */
export const BlocksRenderer: React.FC<BlocksRendererProps> = ({blocks}) => {
	return (
		<View>
			{blocks.map((block, index) => {
				const key = `${block.type}-${index}`;
				
				switch (block.type) {
					case 'hero':
						return (
							<HeroBlock 
								key={key}
								headline={block.props.headline}
								subline={block.props.subline}
								image_url={block.props.image_url}
							/>
						);
					case 'text':
						return (
							<TextBlock 
								key={key}
								text={block.props.text}
							/>
						);
					case 'offer_grid':
						return (
							<OfferGridBlock 
								key={key}
								title={block.props.title}
								items={block.props.items}
							/>
						);
					default:
						return <FallbackBlock key={key} type={block.type} />;
				}
			})}
		</View>
	);
};
